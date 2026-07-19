'use client';

import React, { useEffect, useRef, useState, useCallback, memo, useMemo } from 'react';
import dynamic from 'next/dynamic';
import type BaseReactPlayer from 'react-player';

const ReactPlayer = dynamic(() => import('react-player'), { ssr: false });
import { RoomState, VideoSource } from '@/types';
import type { QueueItem } from '@/types';
import { Film, Sparkles, Minimize, Maximize, X, Moon, Sun, Hand } from 'lucide-react';
import { Socket } from 'socket.io-client';
import { VideoControls } from './VideoControls';
import { normalizeYouTubeUrl } from '@/lib/youtube';
import { createClockSyncEngine } from '@/lib/clockSync';

declare global {
  interface Window {
    dashjs: any;
  }
}

interface VideoPlayerProps {
  roomId: string;
  videoSource: VideoSource;
  isHost: boolean;
  isCoHost?: boolean;
  socket: Socket | null;
  queue?: QueueItem[];
  onQueueUpdate?: (queue: QueueItem[]) => void;
  onCinemaModeChange?: (enabled: boolean) => void;
  onAmbientColorChange?: (color: string) => void;
}

const SYNC_THRESHOLD = 0.8; // Correct drift above 800ms (was 400ms — too tight, caused stuttering)
const HARD_SYNC_THRESHOLD = 2.5; // Hard seek for drift above 2.5s (was 1.5s — triggered too often)
const SYNC_NEGATIVE_BIAS = 0.15; // 150ms bias to keep viewers slightly BEHIND host (prevents ahead drift)

const VideoPlayerComponent: React.FC<VideoPlayerProps> = ({
  roomId,
  videoSource,
  isHost,
  isCoHost = false,
  socket,
  queue = [],
  onQueueUpdate,
  onCinemaModeChange,
  onAmbientColorChange
}) => {
  const playerRef = useRef<BaseReactPlayer>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const ambientCanvasRef = useRef<HTMLCanvasElement>(null);

  // Local State
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isPiP, setIsPiP] = useState(false);
  const [showSyncWarning, setShowSyncWarning] = useState(true);
  const [isVideoReady, setIsVideoReady] = useState(false); // Track when video is actually ready
  const [cinemaMode, setCinemaMode] = useState(false); // Cinema mode - dims everything except video
  const [ambientMode, setAmbientMode] = useState(false); // Ambient light mode - Philips Ambilight effect
  const [ambientColor, setAmbientColor] = useState('#000000'); // Current dominant color
  const [requestedControl, setRequestedControl] = useState(false); // Viewer requested control
  const clockOffsetRef = useRef(0); // Server time offset (ref to avoid stale closures)
  const bufferingRef = useRef(false); // Local buffering state tracker
  const [hostBuffering, setHostBuffering] = useState(false); // Host is buffering
  const hostBufferingTimerRef = useRef<NodeJS.Timeout | undefined>(undefined); // Debounce host buffering
  const bufferStartTimeRef = useRef<number>(0); // Track when buffering started (host only)

  // Notify parent when cinema mode changes
  useEffect(() => {
    onCinemaModeChange?.(cinemaMode);
  }, [cinemaMode, onCinemaModeChange]);

  // Load dash.js if needed
  useEffect(() => {
    const isDASH = videoSource.url?.includes('.mpd');
    if (isDASH && !window.dashjs) {
      console.log('[VIDEO] Loading dashjs from CDN...');
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/dashjs/4.7.4/dash.all.min.js';
      script.async = true;
      script.id = 'dashjs-script';
      document.head.appendChild(script);

      return () => {
        const existingScript = document.getElementById('dashjs-script');
        if (existingScript) existingScript.remove();
      };
    }
  }, [videoSource.url]);

  // Ambient Light Effect - Sample dominant color every second
  useEffect(() => {
    if (!ambientMode || !playing) return;

    const sampleColor = () => {
      try {
        const player = playerRef.current?.getInternalPlayer();
        if (!player) return;

        // Try to get video element from player
        let videoElement: HTMLVideoElement | null = null;

        if (player instanceof HTMLVideoElement) {
          videoElement = player;
        } else if (player.getVideoData) {
          // YouTube player - we can&apos;t directly access video due to CORS
          // Use a fallback color based on theme
          const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dfe6e9', '#a29bfe', '#fd79a8'];
          const randomColor = colors[Math.floor(Math.random() * colors.length)];
          setAmbientColor(randomColor);
          onAmbientColorChange?.(randomColor);
          return;
        }

        if (videoElement) {
          const canvas = ambientCanvasRef.current;
          if (!canvas) return;

          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          // Sample a small portion of the video
          canvas.width = 16;
          canvas.height = 16;
          ctx.drawImage(videoElement, 0, 0, 16, 16);

          // Get average color
          const imageData = ctx.getImageData(0, 0, 16, 16);
          const data = imageData.data;
          let r = 0, g = 0, b = 0;

          for (let i = 0; i < data.length; i += 4) {
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
          }

          const pixels = data.length / 4;
          r = Math.floor(r / pixels);
          g = Math.floor(g / pixels);
          b = Math.floor(b / pixels);

          // Boost saturation for better effect
          const max = Math.max(r, g, b);
          const boost = 255 / (max || 1);
          r = Math.min(255, Math.floor(r * boost * 0.7));
          g = Math.min(255, Math.floor(g * boost * 0.7));
          b = Math.min(255, Math.floor(b * boost * 0.7));

          const color = `rgb(${r}, ${g}, ${b})`;
          setAmbientColor(color);
          onAmbientColorChange?.(color);
        }
      } catch {
        // CORS or other error - use fallback
        console.debug('Ambient color sampling failed, using fallback');
      }
    };

    // Sample immediately and then every second
    sampleColor();
    const interval = setInterval(sampleColor, 1000);

    return () => clearInterval(interval);
  }, [ambientMode, playing, onAmbientColorChange]);

  // Request control handler - with cleanup
  const requestControlTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const handleRequestControl = useCallback(() => {
    if (socket && !isHost && !requestedControl) {
      socket.emit('room:request-control', { roomId });
      setRequestedControl(true);
      // Reset after 30 seconds - clear any existing timeout first
      if (requestControlTimeoutRef.current) {
        clearTimeout(requestControlTimeoutRef.current);
      }
      requestControlTimeoutRef.current = setTimeout(() => setRequestedControl(false), 30000);
    }
  }, [socket, roomId, isHost, requestedControl]);

  // Cleanup request control timeout on unmount
  useEffect(() => {
    return () => {
      if (requestControlTimeoutRef.current) {
        clearTimeout(requestControlTimeoutRef.current);
      }
    };
  }, []);

  // Precision Clock Synchronization (Multi-pass NTP engine)
  const clockEngineRef = useRef<ReturnType<typeof createClockSyncEngine> | null>(null);
  useEffect(() => {
    if (!socket || !socket.connected) return;

    const engine = createClockSyncEngine();
    clockEngineRef.current = engine;

    engine.onSyncComplete((offset, confidence) => {
      clockOffsetRef.current = offset;
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[NTP] Synced: offset=${offset.toFixed(1)}ms, confidence=${(confidence * 100).toFixed(0)}%`);
      }
    });

    engine.start(socket);

    return () => {
      engine.stop();
      clockEngineRef.current = null;
    };
  }, [socket]);

  // Tab visibility change handling — resync on return
  // NOTE: Clock resync is handled by the NTP engine automatically.
  // This effect only handles player state resync.
  useEffect(() => {
    if (!socket) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (process.env.NODE_ENV !== 'production') {
          console.log('[SYNC] Tab became visible — requesting resync');
        }

        // Trigger NTP engine resync (burst of 10 pings)
        clockEngineRef.current?.resync();

        // Request fresh playback state from server
        if (roomId) {
          socket.emit('player:request_sync', { roomId });
        }
        // Reset sync gates so we accept the incoming sync
        ignoreSyncUntilRef.current = 0;
        lastSyncTimeRef.current = 0;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [socket, roomId]);

  const isRemoteUpdate = useRef(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const lastSyncTimeRef = useRef<number>(0); // Debounce syncs
  const ignoreSyncUntilRef = useRef<number>(0); // Ignore syncs until this timestamp
  const lastEmittedStateRef = useRef<{ playing: boolean; timestamp: number } | null>(null); // Track what we last sent
  const wasFullscreenRef = useRef(false);
  const fullscreenToggleLockRef = useRef(false);

  // Normalize YouTube URLs - memoized to prevent unnecessary re-renders
  // Use video ID as key to ensure stability
  const videoIdRef = useRef<string | null>(null);
  const normalizedUrl = useMemo(() => {
    if (!videoSource.url) {
      videoIdRef.current = null;
      return videoSource.url;
    }

    // Only normalize YouTube URLs
    if (videoSource.provider === 'youtube' || videoSource.url.includes('youtube.com') || videoSource.url.includes('youtu.be')) {
      const normalized = normalizeYouTubeUrl(videoSource.url);
      if (normalized) {
        // Extract video ID for comparison
        const videoId = normalized.match(/[?&]v=([^&]+)/)?.[1] || normalized.match(/youtu\.be\/([^?]+)/)?.[1];
        videoIdRef.current = videoId || null;
        return normalized; // Always use normalized format for consistency
      }
      // If normalization fails, try to extract ID from original URL
      const fallbackId = videoSource.url.match(/[?&]v=([^&]+)/)?.[1] || videoSource.url.match(/youtu\.be\/([^?]+)/)?.[1];
      videoIdRef.current = fallbackId || null;
      return videoSource.url; // Fallback to original
    }

    // For non-YouTube videos, return as-is
    videoIdRef.current = null;
    return videoSource.url;
  }, [videoSource.url, videoSource.provider]);

  // Refs to prevent stale closures in socket listeners
  const playingRef = useRef(playing);
  const queueRef = useRef(queue);
  const isHostRef = useRef(isHost);
  const isCoHostRef = useRef(isCoHost);
  const isSeekingRef = useRef(isSeeking);
  const playbackRateRef = useRef(playbackRate);
  const lastPlayPauseRef = useRef<number>(0); // Debounce play/pause clicks

  // Keep refs synced with state
  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    isHostRef.current = isHost;
  }, [isHost]);

  useEffect(() => {
    isCoHostRef.current = isCoHost;
  }, [isCoHost]);

  useEffect(() => {
    isSeekingRef.current = isSeeking;
  }, [isSeeking]);

  useEffect(() => {
    playbackRateRef.current = playbackRate;
  }, [playbackRate]);

  // Auto-hide controls after 3 seconds of inactivity
  useEffect(() => {
    const handleActivity = () => {
      setShowControls(true);

      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }

      controlsTimeoutRef.current = setTimeout(() => {
        if (playing) {
          setShowControls(false);
        }
      }, 3000);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleActivity);
      container.addEventListener('click', handleActivity);
    }

    return () => {
      if (container) {
        container.removeEventListener('mousemove', handleActivity);
        container.removeEventListener('click', handleActivity);
      }
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [playing]);

  // Refs for keyboard handler — avoids stale closures and re-registration churn
  const mutedRef = useRef(muted);
  const volumeRef = useRef(volume);
  useEffect(() => { mutedRef.current = muted; }, [muted]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);

  // Function refs — these callbacks are declared later in the component,
  // so we store them in refs and update them after declaration
  const handlePlayPauseRef = useRef<() => void>(() => { });
  const toggleFullscreenRef = useRef<() => void>(() => { });
  const togglePiPRef = useRef<() => void>(() => { });
  const seekRelativeRef = useRef<(seconds: number) => void>(() => { });

  // Keyboard shortcuts — registered once, reads refs for latest values
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          handlePlayPauseRef.current();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreenRef.current();
          break;
        case 'm':
          e.preventDefault();
          setMuted(!mutedRef.current);
          break;
        case 'p':
          e.preventDefault();
          togglePiPRef.current();
          break;
        case 'arrowleft':
          e.preventDefault();
          seekRelativeRef.current(-10);
          break;
        case 'arrowright':
          e.preventDefault();
          seekRelativeRef.current(10);
          break;
        case 'arrowup':
          e.preventDefault();
          setVolume(Math.min(1, volumeRef.current + 0.1));
          break;
        case 'arrowdown':
          e.preventDefault();
          setVolume(Math.max(0, volumeRef.current - 0.1));
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Optimized Sync Logic with Soft Sync Algorithm
  useEffect(() => {
    if (!socket) return;

    const handleSync = (serverState: RoomState & { forcedSeek?: boolean }) => {
      // Use refs to avoid stale closures
      if (isSeekingRef.current) return;

      const now = Date.now();
      const { isPlaying: serverPlaying, timestamp, lastUpdated, forcedSeek } = serverState;

      // For forced seeks (from host), always respect immediately — BEFORE any guards.
      // This must not be blocked by isVideoReady/duration checks because the host
      // may seek while the viewer's player is still loading.
      if (forcedSeek && !isHostRef.current) {
        console.log(`[SYNC] Forced seek received: ${timestamp.toFixed(2)}s, playing=${serverPlaying}`);
        // Clear ALL sync gates — host action is authoritative
        ignoreSyncUntilRef.current = 0;
        lastSyncTimeRef.current = now;
        setHostBuffering(false);
        // Seek first, then set play state
        playerRef.current?.seekTo(timestamp, 'seconds');
        isRemoteUpdate.current = true;
        setPlaying(serverPlaying);
        // Belt-and-suspenders: directly command the internal player after a tick
        // to ensure ReactPlayer's prop change actually takes effect
        setTimeout(() => {
          try {
            const internal = playerRef.current?.getInternalPlayer();
            if (internal) {
              if (serverPlaying) {
                if (typeof internal.playVideo === 'function') internal.playVideo();
                else if (typeof internal.play === 'function') internal.play();
              } else {
                if (typeof internal.pauseVideo === 'function') internal.pauseVideo();
                else if (typeof internal.pause === 'function') internal.pause();
              }
            }
          } catch { /* ignore */ }
        }, 100);
        return;
      }

      // Ignore syncs for a cooldown period after local host/co-host action
      if (now < ignoreSyncUntilRef.current) {
        console.log('[SYNC] Ignoring - within cooldown period');
        return;
      }

      // Debounce sync: ignore if we just synced within 300ms (prevent flood)
      if (now - lastSyncTimeRef.current < 300) {
        return;
      }

      // Don't sync if video isn't ready yet
      if (!isVideoReady || !duration || duration === 0) {
        console.log('[SYNC] Skipping - video not ready');
        return;
      }

      const currentPlaying = playingRef.current;
      const currentPlayerTime = playerRef.current?.getCurrentTime();

      // Guard against invalid time values
      if (currentPlayerTime === undefined || currentPlayerTime === null || isNaN(currentPlayerTime)) {
        return;
      }

      // Calculate time elapsed since server update using clock offset
      // Clamp timeSinceUpdate to max 2 seconds to avoid huge jumps from stale updates
      const adjustedNow = Date.now() + clockOffsetRef.current;
      const timeSinceUpdate = Math.min((adjustedNow - lastUpdated) / 1000, 2);
      // Apply negative bias ONLY for progress-based syncs (not seeks) to keep viewers
      // slightly behind host rather than ahead. Bias is NOT applied when paused.
      const biasedTimeSinceUpdate = serverPlaying ? Math.max(0, timeSinceUpdate - SYNC_NEGATIVE_BIAS) : 0;
      const targetTime = serverPlaying ? timestamp + biasedTimeSinceUpdate : timestamp;

      // Check if this sync matches what we just sent (echo from server) — only for host
      if (isHostRef.current) {
        const lastEmitted = lastEmittedStateRef.current;
        if (lastEmitted) {
          const isEcho = lastEmitted.playing === serverPlaying &&
            Math.abs(lastEmitted.timestamp - timestamp) < 1;
          if (isEcho) {
            console.log('[SYNC] Ignoring echo of our own action');
            return;
          }
        }
      }

      // Prevent sync loops near start of video
      if (targetTime < 2 && currentPlayerTime < 2) {
        // Just sync play state if different, don't seek
        if (serverPlaying !== currentPlaying) {
          isRemoteUpdate.current = true;
          setPlaying(serverPlaying);
          lastSyncTimeRef.current = now;
        }
        return;
      }

      const drift = currentPlayerTime - targetTime;
      const absDrift = Math.abs(drift);

      // If we're very close (< 1s), don't bother syncing time
      if (absDrift < SYNC_THRESHOLD) {
        // Just ensure play state is correct
        if (serverPlaying !== currentPlaying) {
          isRemoteUpdate.current = true;
          setPlaying(serverPlaying);
          lastSyncTimeRef.current = now;
        }
        // Reset playback rate if needed
        if (playbackRateRef.current !== 1) {
          setPlaybackRate(1);
          console.log('[SYNC] Drift resolved — resetting playback rate to 1.0x');
        }
        return;
      }

      // CRITICAL: Sync play/pause state IMMEDIATELY — no debounce for state changes
      if (serverPlaying !== currentPlaying) {
        console.log(`[SYNC] State change: ${currentPlaying ? 'PLAYING' : 'PAUSED'} → ${serverPlaying ? 'PLAYING' : 'PAUSED'} at ${timestamp.toFixed(2)}s`);
        isRemoteUpdate.current = true;
        setPlaying(serverPlaying);

        // Clear stale host buffering on state change (if host plays, they aren't buffering)
        if (serverPlaying) {
          setHostBuffering(false);
        }

        // Always sync timestamp on state change
        playerRef.current?.seekTo(serverPlaying ? targetTime : timestamp, 'seconds');
        lastSyncTimeRef.current = now;
        if (playbackRateRef.current !== 1) {
          setPlaybackRate(1);
        }
        // Belt-and-suspenders: directly command the internal player to avoid
        // ReactPlayer prop-change races that leave viewers stuck buffering
        setTimeout(() => {
          try {
            const internal = playerRef.current?.getInternalPlayer();
            if (internal) {
              if (serverPlaying) {
                if (typeof internal.playVideo === 'function') internal.playVideo();
                else if (typeof internal.play === 'function') internal.play();
              } else {
                if (typeof internal.pauseVideo === 'function') internal.pauseVideo();
                else if (typeof internal.pause === 'function') internal.pause();
              }
            }
          } catch { /* ignore */ }
        }, 100);
        return;
      }

      // Only sync time if playing and drift is significant
      if (!serverPlaying) return;

      // HARD SYNC: Seek for large drifts (> 1.5s)
      if (absDrift > HARD_SYNC_THRESHOLD) {
        console.log(`[SYNC] Hard sync: Drift ${absDrift.toFixed(2)}s, seeking to ${targetTime.toFixed(2)}s`);
        playerRef.current?.seekTo(targetTime, 'seconds');
        lastSyncTimeRef.current = now;
        if (playbackRateRef.current !== 1) {
          setPlaybackRate(1);
        }
      }
      // SOFT SYNC: Adjust playback rate for medium drifts
      else if (absDrift > SYNC_THRESHOLD) {
        // Moderate rate adjustment for faster drift recovery (was 0.02 — too slow)
        const rateAdjustment = 0.05;
        const newRate = drift > 0 ? (1 - rateAdjustment) : (1 + rateAdjustment);

        if (Math.abs(playbackRateRef.current - newRate) > 0.01) {
          setPlaybackRate(newRate);
          console.log(`[SYNC] Soft sync: Rate ${newRate.toFixed(2)}x (drift: ${drift.toFixed(2)}s)`);
        }
        lastSyncTimeRef.current = now;
      }
    };

    const handleBuffering = ({ isBuffering }: { isBuffering: boolean }) => {
      if (!isHostRef.current) {
        if (isBuffering) {
          // DEBOUNCE: Only show spinner after 800ms of continuous buffering.
          // Brief buffer events (e.g. during seeks) are suppressed.
          if (hostBufferingTimerRef.current) clearTimeout(hostBufferingTimerRef.current);
          hostBufferingTimerRef.current = setTimeout(() => {
            setHostBuffering(true);
          }, 800);
          // Safety: auto-clear after 10s if we miss the resolve event
          setTimeout(() => {
            if (hostBufferingTimerRef.current) clearTimeout(hostBufferingTimerRef.current);
            setHostBuffering(false);
          }, 10000);
        } else {
          // Immediately clear spinner when host stops buffering
          if (hostBufferingTimerRef.current) {
            clearTimeout(hostBufferingTimerRef.current);
            hostBufferingTimerRef.current = undefined;
          }
          setHostBuffering(false);
        }
      }
    };

    socket.on('player:sync', handleSync);
    socket.on('player:buffering', handleBuffering);

    // Reset sync gates on socket reconnect so we accept fresh state
    const handleReconnect = () => {
      console.log('[SYNC] Socket reconnected — resetting sync gates');
      ignoreSyncUntilRef.current = 0;
      lastSyncTimeRef.current = 0;
      if (roomId) {
        socket.emit('player:request_sync', { roomId });
      }
    };
    socket.on('connect', handleReconnect);

    // Send progress to server periodically when playing (host only - to keep server state fresh)
    const progressInterval = setInterval(() => {
      if (socket.connected && isHostRef.current && videoSource.url && isVideoReady && duration > 0 && playingRef.current && !bufferingRef.current) {
        const currentTime = playerRef.current?.getCurrentTime() || 0;
        // Only send progress update, not requesting sync back
        socket.emit('player:progress', {
          roomId,
          timestamp: currentTime,
          isPlaying: playingRef.current
        });
      }
    }, 2000); // Every 2 seconds (increased frequency from 5s)

    return () => {
      socket.off('player:sync', handleSync);
      socket.off('player:buffering', handleBuffering);
      socket.off('connect', handleReconnect);
      clearInterval(progressInterval);
      if (hostBufferingTimerRef.current) {
        clearTimeout(hostBufferingTimerRef.current);
        hostBufferingTimerRef.current = undefined;
      }
    };
  }, [socket, roomId, videoSource.url, duration, isVideoReady]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = !!document.fullscreenElement;
      setIsFullscreen(isFs);

      try {
        if (isFs && window.innerWidth < 768) {
          // Auto-rotate horizontal on mobile when entering fullscreen
          (screen.orientation as any).lock('landscape').catch(() => { });
        } else if (wasFullscreenRef.current && !isFs) {
          // Unlock orientation when exiting fullscreen
          (screen.orientation as any).unlock();
        }
      } catch {
        // ignore
      }

      wasFullscreenRef.current = isFs;
    };

    const handlePiPChange = () => {
      setIsPiP(!!document.pictureInPictureElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('enterpictureinpicture', handlePiPChange);
    document.addEventListener('leavepictureinpicture', handlePiPChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('enterpictureinpicture', handlePiPChange);
      document.removeEventListener('leavepictureinpicture', handlePiPChange);
    };
  }, []);


  // HOST CONTROL: Only host and co-hosts can control playback
  const handlePlayPause = useCallback(() => {
    // 2-second debounce - prevent rapid clicks
    const now = Date.now();
    if (now - lastPlayPauseRef.current < 2000) {
      console.log('[CONTROL] Play/pause debounced - too soon');
      return;
    }

    // Viewers can't control playback - only host and co-host can
    if (!isHostRef.current && !isCoHostRef.current) {
      console.log('[CONTROL] Viewer tried to play/pause - blocked');
      return;
    }

    lastPlayPauseRef.current = now;
    const newPlaying = !playingRef.current;
    const actionTime = Date.now();
    ignoreSyncUntilRef.current = actionTime + 2000; // Ignore syncs for 2 seconds
    lastSyncTimeRef.current = actionTime;
    if (!isRemoteUpdate.current && socket?.connected) {
      const currentTime = playerRef.current?.getCurrentTime() || 0;
      // Track what we emitted to detect echoes
      lastEmittedStateRef.current = { playing: newPlaying, timestamp: currentTime };
      socket.emit('player:update', {
        roomId,
        state: {
          isPlaying: newPlaying,
          timestamp: currentTime
        }
      });
      console.log(`[SYNC] Emitted play/pause: ${newPlaying ? 'PLAY' : 'PAUSE'} at ${currentTime.toFixed(2)}s`);
    }
    setPlaying(newPlaying);
    isRemoteUpdate.current = false;
  }, [socket, roomId]);
  handlePlayPauseRef.current = handlePlayPause;

  const handlePlay = useCallback(() => {
    // If this is a remote update (from host sync), just accept it — DO NOT
    // set ignoreSyncUntil or emit socket events. The viewer must remain
    // obedient to the host's state.
    if (isRemoteUpdate.current) {
      setPlaying(true);
      isRemoteUpdate.current = false;
      return;
    }

    // Viewers can't control playback
    if (!isHostRef.current && !isCoHostRef.current) {
      console.log('[CONTROL] Viewer tried to play - blocked');
      return;
    }

    // Host/co-host: emit to server and set cooldown
    const now = Date.now();
    ignoreSyncUntilRef.current = now + 2000;
    lastSyncTimeRef.current = now;
    if (socket?.connected) {
      const currentTime = playerRef.current?.getCurrentTime() || 0;
      lastEmittedStateRef.current = { playing: true, timestamp: currentTime };
      socket.emit('player:update', {
        roomId,
        state: {
          isPlaying: true,
          timestamp: currentTime
        }
      });
      console.log(`[SYNC] Emitted PLAY at ${currentTime.toFixed(2)}s`);
    }
    setPlaying(true);
  }, [socket, roomId]);

  const handlePause = useCallback(() => {
    // If this is a remote update (from host sync), just accept it — DO NOT
    // set ignoreSyncUntil or emit socket events. The viewer must remain
    // obedient to the host's state.
    if (isRemoteUpdate.current) {
      setPlaying(false);
      isRemoteUpdate.current = false;
      return;
    }

    // Viewers can't control playback
    if (!isHostRef.current && !isCoHostRef.current) {
      console.log('[CONTROL] Viewer tried to pause - blocked');
      return;
    }

    // Host/co-host: emit to server and set cooldown
    const now = Date.now();
    ignoreSyncUntilRef.current = now + 2000;
    lastSyncTimeRef.current = now;
    if (socket?.connected) {
      const currentTime = playerRef.current?.getCurrentTime() || 0;
      lastEmittedStateRef.current = { playing: false, timestamp: currentTime };
      socket.emit('player:update', {
        roomId,
        state: {
          isPlaying: false,
          timestamp: currentTime
        }
      });
      console.log(`[SYNC] Emitted PAUSE at ${currentTime.toFixed(2)}s`);
    }
    setPlaying(false);
  }, [socket, roomId]);

  const seekThrottleRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const pendingSeekRef = useRef<number | null>(null);

  const seekRelative = useCallback((seconds: number) => {
    // Viewers can't seek
    if (!isHostRef.current) {
      console.log('[CONTROL] Viewer tried to seek - blocked');
      return;
    }

    const currentTime = playerRef.current?.getCurrentTime() || 0;
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    const now = Date.now();
    setIsSeeking(true);
    ignoreSyncUntilRef.current = now + 2000; // Ignore syncs for 2 seconds
    lastSyncTimeRef.current = now;
    // Track what we emitted
    lastEmittedStateRef.current = { playing: playingRef.current, timestamp: newTime };
    playerRef.current?.seekTo(newTime, 'seconds');

    // Throttle network emission — only send last seek position
    pendingSeekRef.current = newTime;
    if (!seekThrottleRef.current) {
      seekThrottleRef.current = setTimeout(() => {
        seekThrottleRef.current = undefined;
        if (pendingSeekRef.current !== null && socket?.connected) {
          socket.emit('player:seek', { roomId, timestamp: pendingSeekRef.current });
          console.log(`[SYNC] Emitted SEEK to ${pendingSeekRef.current.toFixed(2)}s`);
          pendingSeekRef.current = null;
        }
      }, 300);
    }

    setTimeout(() => setIsSeeking(false), 500);
  }, [socket, roomId, duration]);
  seekRelativeRef.current = seekRelative;

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow viewers to preview the seek position, but not actually seek
    if (isHostRef.current) {
      setIsSeeking(true);
      setProgress(parseFloat(e.target.value));
    }
  };

  const handleSeekMouseUp = useCallback((e: React.MouseEvent<HTMLInputElement>) => {
    // Viewers can&apos;t seek - only host and co-host can
    if (!isHostRef.current && !isCoHostRef.current) {
      console.log('[CONTROL] Viewer tried to seek via slider - blocked');
      return;
    }

    const newTime = parseFloat((e.target as HTMLInputElement).value);
    const now = Date.now();
    setIsSeeking(false);
    ignoreSyncUntilRef.current = now + 2000; // Ignore syncs for 2 seconds
    lastSyncTimeRef.current = now;
    // Track what we emitted
    lastEmittedStateRef.current = { playing: playingRef.current, timestamp: newTime };
    playerRef.current?.seekTo(newTime);
    if (socket?.connected) {
      socket.emit('player:seek', { roomId, timestamp: newTime });
      console.log(`[SYNC] Emitted SEEK to ${newTime.toFixed(2)}s`);
    }
  }, [socket, roomId]);

  const handleProgress = useCallback((state: { playedSeconds: number }) => {
    // Use ref to avoid stale closure
    if (!isSeekingRef.current) {
      setProgress(state.playedSeconds);
    }
  }, []);

  // Handle video ready - called when duration is available
  const handleDuration = useCallback((dur: number) => {
    console.log(`[VIDEO] Duration loaded: ${dur}s`);
    setDuration(dur);
    // Mark video as ready after a short delay to let things stabilize
    setTimeout(() => {
      setIsVideoReady(true);
      console.log('[VIDEO] Video marked as ready');
      // Request sync from server when video is ready (crucial for new viewers)
      if (socket && roomId) {
        console.log('[SYNC] Requesting sync after video ready');
        socket.emit('player:request_sync', { roomId });
      }
    }, 500);
  }, [socket, roomId]);

  // Reset video ready state when video changes
  useEffect(() => {
    setIsVideoReady(false);
    setDuration(0);
    setProgress(0);
    lastSyncTimeRef.current = 0;
  }, [videoSource.url]);

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    // Mobile browsers can dispatch duplicate tap/click paths; ignore rapid re-entry.
    if (fullscreenToggleLockRef.current) return;
    fullscreenToggleLockRef.current = true;
    setTimeout(() => {
      fullscreenToggleLockRef.current = false;
    }, 700);

    if (!document.fullscreenElement) {
      try {
        // Try to lock orientation for better fullscreen experience on mobile
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const orientationAny = screen.orientation as any;
        if (orientationAny && typeof orientationAny.lock === 'function') {
          try {
            await orientationAny.lock('landscape');
          } catch {
            // Orientation lock not supported or denied - continue with fullscreen
          }
        }
        await containerRef.current.requestFullscreen();
      } catch (err) {
        console.log('[Fullscreen] Failed:', err);
      }
    } else {
      try {
        await document.exitFullscreen();
      } catch (err) {
        console.log('[Exit fullscreen] Failed:', err);
      }
    }
  };
  toggleFullscreenRef.current = toggleFullscreen;

  const togglePiP = async () => {
    try {
      // Try to get the video element from ReactPlayer
      const videoElement = playerRef.current?.getInternalPlayer() as HTMLVideoElement;

      if (!videoElement || !(videoElement instanceof HTMLVideoElement)) {
        console.log('PiP not supported for this video type');
        return;
      }

      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await videoElement.requestPictureInPicture();
      }
    } catch (err) {
      console.error('PiP error:', err);
    }
  };
  togglePiPRef.current = togglePiP;

  const handleVideoEnd = useCallback(() => {
    // Use refs to avoid stale closures
    const currentQueue = queueRef.current;
    const currentIsHost = isHostRef.current;

    if (currentQueue.length > 0 && currentIsHost) {
      const nextItem = currentQueue[0];
      // Use the new queue play_next event which handles everything server-side
      socket?.emit('room:queue_play_next', { roomId, queueItemId: nextItem.id });
    }
  }, [socket, roomId]);

  const skipToNext = useCallback(() => {
    const currentQueue = queueRef.current;
    const currentIsHost = isHostRef.current;

    if (currentQueue.length > 0 && currentIsHost) {
      handleVideoEnd();
    }
  }, [handleVideoEnd]);

  // Check if URL is a movie embed
  const isMovieEmbed = (videoSource.url?.includes('vidsrc') || videoSource.provider === 'movie') && videoSource.provider !== 'iptv';

  // Check if URL is an IPTV/HLS stream
  const isHLS = videoSource.url?.endsWith('.m3u8') || videoSource.url?.includes('.m3u8');
  const isDASH = videoSource.url?.endsWith('.mpd') || videoSource.url?.includes('.mpd');
  const isIPTV = videoSource.provider === 'iptv' || isHLS || isDASH;

  return (
    <div className="relative">
      {/* Ambient Light Canvas - Hidden, used for color sampling */}
      <canvas ref={ambientCanvasRef} className="hidden" />

      {/* Ambient Light Glow Effect - Behind video */}
      {ambientMode && (
        <div
          className="absolute -inset-8 rounded-3xl blur-3xl opacity-60 transition-all duration-1000 pointer-events-none"
          style={{ backgroundColor: ambientColor }}
        />
      )}

      <div
        ref={containerRef}
        className={`relative w-full aspect-video bg-black overflow-hidden group ${isFullscreen ? 'fixed inset-0 z-50' : 'rounded-xl shadow-2xl'}`}
        style={isFullscreen ? { width: '100vw', height: '100vh', maxWidth: 'none', maxHeight: 'none' } : undefined}
      >
        {/* Placeholder when no video */}
        {!videoSource.url ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
            <div className="text-center space-y-4 p-8">
              <div className="animate-bounce">
                <Film size={64} className="text-pink-400 mx-auto" />
              </div>
              <h3 className="text-2xl font-bold text-white">No video playing yet!</h3>
              <div className="flex items-center justify-center gap-2 text-gray-300 text-lg max-w-md">
                <Sparkles size={20} className="text-yellow-400" />
                <span>Search for a video or paste a link above to start watching together</span>
                <Sparkles size={20} className="text-yellow-400" />
              </div>
            </div>
          </div>
        ) : isMovieEmbed ? (
          /* Movie/TV Embed Player - Simple iframe without custom controls */
          <>
            <iframe
              src={videoSource.url}
              width="100%"
              height="100%"
              allowFullScreen
              allow="autoplay; fullscreen; picture-in-picture"
              className="absolute inset-0 w-full h-full"
              style={{ border: 'none' }}
              referrerPolicy="no-referrer"
            />

            {/* Fullscreen Button for Movie Embeds */}
            <button
              onClick={toggleFullscreen}
              className="absolute top-4 left-4 z-20 p-2 bg-black/70 hover:bg-black/90 rounded-lg transition-colors text-white"
              title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
              aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>

            {/* Sync Warning Banner */}
            {showSyncWarning && (
              <div className="absolute bottom-4 left-0 right-0 flex justify-center z-10">
                <div className="bg-yellow-500/90 border-2 border-yellow-600 rounded-lg px-4 py-2 text-center max-w-md mx-4 relative">
                  <button
                    onClick={() => setShowSyncWarning(false)}
                    className="absolute top-1 right-1 p-1 hover:bg-yellow-600/50 rounded transition-colors"
                    title="Close"
                  >
                    <X size={16} className="text-yellow-900" />
                  </button>
                  <p className="text-yellow-900 font-bold text-sm pr-6">⚠️ Automatic Sync Unavailable for Movies</p>
                  <p className="text-yellow-800 text-xs mt-1">Everyone must press Play/Pause manually. Sync works for YouTube videos only.</p>
                </div>
              </div>
            )}
          </>
        ) : isIPTV ? (
          /* IPTV/HLS Live TV Player */
          <>
            <MemoizedReactPlayer
              key={`iptv-${videoSource.url}`}
              ref={playerRef}
              url={videoSource.url}
              width="100%"
              height="100%"
              playing={playing}
              volume={volume}
              muted={muted}
              onPlay={handlePlay}
              onPause={handlePause}
              onProgress={handleProgress}
              onDuration={handleDuration}
              onBuffer={() => {
                setBuffering(true);
                bufferStartTimeRef.current = Date.now();
                if (isHostRef.current) {
                  setTimeout(() => {
                    if (bufferingRef.current) {
                      socket?.emit('player:buffering', { roomId, isBuffering: true });
                    }
                  }, 500);
                }
              }}
              onBufferEnd={() => {
                const bufferDuration = Date.now() - bufferStartTimeRef.current;
                setBuffering(false);
                if (isHostRef.current) {
                  if (bufferDuration >= 500) {
                    socket?.emit('player:buffering', { roomId, isBuffering: false });
                  }
                }
              }}
              onError={(e: any) => {
                console.error('[IPTV] Playback error:', e);
                setBuffering(false);
              }}
              controls={false}
              style={{ pointerEvents: 'none' }}
              config={{
                file: {
                  forceHLS: isHLS,
                  forceDASH: isDASH,
                  attributes: {
                    // No crossOrigin for proxied streams (same-origin) to avoid audio corruption
                    ...(videoSource.url?.startsWith('/api/iptv-proxy') ? {} : { crossOrigin: 'anonymous' }),
                  },
                  hlsOptions: {
                    enableWorker: true,
                    lowLatencyMode: true,
                    backBufferLength: 90,
                    xhrSetup: (xhr: XMLHttpRequest, url: string) => {
                      // Proxy HTTP URLs through our server to avoid mixed-content/CSP blocks
                      if (url.startsWith('http://')) {
                        const proxyUrl = `/api/iptv-proxy?url=${encodeURIComponent(url)}${videoSource.userAgent ? `&ua=${encodeURIComponent(videoSource.userAgent)}` : ''}${videoSource.referrer ? `&referer=${encodeURIComponent(videoSource.referrer)}` : ''}`;
                        xhr.open('GET', proxyUrl, true);
                      } else {
                        if (videoSource.userAgent) {
                          try { xhr.setRequestHeader('User-Agent', videoSource.userAgent); } catch (_e) { /* browser may block */ }
                        }
                      }
                    }
                  },
                  dashOptions: {
                    streaming: {
                      lowLatencyEnabled: true,
                      abr: {
                        initialBitrate: { audio: -1, video: -1 }
                      }
                    }
                  }
                },
              }}
            />

            {/* LIVE Badge */}
            <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 rounded-lg shadow-lg">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="text-white text-xs font-bold uppercase">LIVE</span>
              </div>
            </div>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="absolute top-4 right-4 z-20 p-2 bg-black/70 hover:bg-black/90 rounded-lg transition-colors text-white"
              title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
            >
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>

            {/* Buffering Indicator (Local or Host) */}
            {(buffering || hostBuffering) && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
                <div className="text-center">
                  <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-white text-sm mt-3 font-medium">
                    {buffering ? 'Loading stream...' : 'Waiting for host...'}
                  </p>
                </div>
              </div>
            )}

            {/* Click to Play/Pause */}
            <div
              className="absolute inset-0 cursor-pointer"
              onClick={handlePlayPause}
              onDoubleClick={toggleFullscreen}
            />

            {/* Volume Control for IPTV */}
            <VideoControls
              progress={progress}
              duration={duration}
              playing={playing}
              volume={volume}
              muted={muted}
              playbackRate={1}
              showControls={showControls}
              showSettings={false}
              showQueue={false}
              queueLength={0}
              isFullscreen={isFullscreen}
              isPiP={false}
              isMovieEmbed={false}
              videoTitle={videoSource.title}
              videoProvider={videoSource.provider}
              onPlayPause={handlePlayPause}
              onSeekChange={handleSeekChange}
              onSeekMouseUp={handleSeekMouseUp}
              onVolumeChange={(vol) => {
                setVolume(vol);
                setMuted(false);
              }}
              onMuteToggle={() => setMuted(!muted)}
              onPlaybackRateChange={setPlaybackRate}
              onToggleFullscreen={toggleFullscreen}
              onTogglePiP={togglePiP}
              onToggleSettings={() => { }}
              onToggleQueue={() => { }}
              isHost={isHost}
            />
          </>
        ) : (
          <>
            {/* Video Player - Memoized to prevent re-renders on progress updates */}
            {/* Use video ID as key to prevent remounting when URL format changes */}
            <MemoizedReactPlayer
              key={videoIdRef.current || normalizedUrl}
              ref={playerRef}
              url={normalizedUrl}
              width="100%"
              height="100%"
              playing={playing}
              volume={volume}
              muted={muted}
              playbackRate={playbackRate}
              onPlay={handlePlay}
              onPause={handlePause}
              onProgress={handleProgress}
              onDuration={handleDuration}
              onBuffer={() => {
                setBuffering(true);
                bufferingRef.current = true;
                bufferStartTimeRef.current = Date.now();
                // Host: delay emitting buffering to suppress brief buffer events (<500ms)
                // The onBufferEnd handler will cancel this if buffering resolves quickly
                if (isHostRef.current) {
                  setTimeout(() => {
                    // Only emit if still buffering after 500ms
                    if (bufferingRef.current) {
                      socket?.emit('player:buffering', { roomId, isBuffering: true });
                    }
                  }, 500);
                }
              }}
              onBufferEnd={() => {
                const bufferDuration = Date.now() - bufferStartTimeRef.current;
                setBuffering(false);
                bufferingRef.current = false;
                if (isHostRef.current) {
                  // Only emit buffer-end if we actually emitted buffer-start (i.e. buffered > 500ms)
                  if (bufferDuration >= 500) {
                    socket?.emit('player:buffering', { roomId, isBuffering: false });
                  }
                }
              }}
              onEnded={handleVideoEnd}
              controls={false}
              style={{ pointerEvents: 'none' }}
              config={{
                youtube: {
                  playerVars: {
                    origin: typeof window !== 'undefined' ? window.location.origin : '',
                    enablejsapi: 1,
                    modestbranding: 1,
                    rel: 0,
                  },
                },
              }}
            />

            {/* Buffering Indicator (Local or Host) */}
            {(buffering || hostBuffering) && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
                <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin" />
                {!buffering && hostBuffering && (
                  <p className="absolute mt-24 text-white text-sm font-medium bg-black/40 px-3 py-1 rounded-full">
                    Host is buffering...
                  </p>
                )}
              </div>
            )}

            {/* Click to Play/Pause */}
            <div
              className="absolute inset-0 cursor-pointer"
              onClick={handlePlayPause}
              onDoubleClick={toggleFullscreen}
            />

            {/* Separated Controls Component - Only re-renders when props change */}
            <VideoControls
              progress={progress}
              duration={duration}
              playing={playing}
              volume={volume}
              muted={muted}
              playbackRate={playbackRate}
              showControls={showControls}
              showSettings={showSettings}
              showQueue={showQueue}
              queueLength={queue.length}
              isFullscreen={isFullscreen}
              isPiP={isPiP}
              isMovieEmbed={false}
              videoTitle={videoSource.title}
              videoProvider={videoSource.provider}
              onPlayPause={handlePlayPause}
              onSeekChange={handleSeekChange}
              onSeekMouseUp={handleSeekMouseUp}
              onVolumeChange={(vol) => {
                setVolume(vol);
                setMuted(false);
              }}
              onMuteToggle={() => setMuted(!muted)}
              onPlaybackRateChange={setPlaybackRate}
              onToggleFullscreen={toggleFullscreen}
              onTogglePiP={togglePiP}
              onToggleSettings={() => setShowSettings(!showSettings)}
              onToggleQueue={() => setShowQueue(!showQueue)}
              onSkipNext={queue.length > 0 && isHost ? skipToNext : undefined}
              isHost={isHost}
            />

            {/* Sync Status Indicator */}
            <div className="absolute top-4 right-4 flex items-center gap-2">
              {/* Cinema Mode Toggle */}
              <button
                onClick={() => setCinemaMode(!cinemaMode)}
                className={`p-2 rounded-lg backdrop-blur-sm border transition-all ${cinemaMode
                  ? 'bg-purple-500/70 border-purple-400 text-white'
                  : 'bg-black/50 border-white/20 text-white hover:bg-black/70'
                  }`}
                title={cinemaMode ? 'Exit Cinema Mode' : 'Cinema Mode'}
              >
                {cinemaMode ? <Sun size={16} /> : <Moon size={16} />}
              </button>

              {/* Sync Status */}
              <div className="flex items-center gap-1.5 px-2 py-1 bg-black/60 rounded-lg">
                <div className={`w-2 h-2 rounded-full ${socket?.connected ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
                <span className="text-xs font-bold uppercase text-white">
                  {socket?.connected ? 'SYNCED' : 'OFFLINE'}
                </span>
              </div>
            </div>

            {/* Host/Viewer Indicator & Request Control */}
            {!isHost && (
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2 py-1 bg-black/60 rounded-lg">
                  <span className="text-xs font-bold text-yellow-400">👁 VIEWER MODE</span>
                </div>
                <button
                  onClick={handleRequestControl}
                  disabled={requestedControl}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all ${requestedControl
                    ? 'bg-green-500/60 text-white cursor-not-allowed'
                    : 'bg-blue-500/60 hover:bg-blue-500/80 text-white'
                    }`}
                  title={requestedControl ? 'Control Requested' : 'Request Host Control'}
                >
                  <Hand size={14} />
                  <span className="text-xs font-bold">
                    {requestedControl ? 'REQUESTED' : 'REQUEST CONTROL'}
                  </span>
                </button>
              </div>
            )}

            {/* Queue Panel */}
            {showQueue && queue.length > 0 && (
              <div className="absolute top-16 right-4 w-72 max-h-64 overflow-y-auto bg-black/90 border border-white/20 rounded-lg p-3">
                <h4 className="font-bold mb-2 text-white">Up Next ({queue.length})</h4>
                <div className="space-y-2">
                  {queue.map((video, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-white/10 rounded text-sm text-white">
                      <span className="text-pink-500 font-bold">{index + 1}</span>
                      <span className="truncate flex-1">{video.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Helper function stored but unused currently - keeping for future use
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _formatTime(seconds: number) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const date = new Date(seconds * 1000);
  const hh = date.getUTCHours();
  const mm = date.getUTCMinutes();
  const ss = date.getUTCSeconds().toString().padStart(2, '0');
  if (hh) {
    return `${hh}:${mm.toString().padStart(2, '0')}:${ss}`;
  }
  return `${mm}:${ss}`;
}

// Memoized ReactPlayer wrapper - prevents re-renders on progress updates
// Only re-renders when URL, playing state, volume, muted, or playbackRate change
const MemoizedReactPlayer = memo(
  React.forwardRef<BaseReactPlayer, React.ComponentProps<typeof BaseReactPlayer>>((props, ref) => (
    <ReactPlayer ref={ref as any} {...props} />
  )),
  (prevProps, nextProps) => {
    // Custom comparison: ignore onProgress changes (progress updates)
    return (
      prevProps.url === nextProps.url &&
      prevProps.playing === nextProps.playing &&
      prevProps.volume === nextProps.volume &&
      prevProps.muted === nextProps.muted &&
      prevProps.playbackRate === nextProps.playbackRate
    );
  }
);

// Export both named and default for compatibility
export const VideoPlayer = memo(VideoPlayerComponent);
export default memo(VideoPlayerComponent);
