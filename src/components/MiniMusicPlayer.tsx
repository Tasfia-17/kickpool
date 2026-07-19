'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, ChevronLeft, Music, GripHorizontal, Disc3, Search, X, Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useToast } from '@/components/ui/Toast';
import YouTube, { YouTubePlayer } from 'react-youtube';
import './MiniMusicPlayer.css';

// Fallback component for GlassSurface
const GlassSurfaceFallback = ({ children, className, ...props }: any) => (
  <div className={className || 'bg-black/50 backdrop-blur-md rounded-2xl'} {...props}>
    {children}
  </div>
);

// Dynamically import GlassSurface with SSR disabled to prevent hydration issues
const GlassSurface = dynamic(
  () => import('@/components/ui/GlassSurface').catch(() => GlassSurfaceFallback),
  {
    ssr: false,
    loading: () => <div className="bg-black/50 backdrop-blur-md rounded-2xl" />
  }
);

interface Track {
  id: string;
  title: string;
  artist: string;
  url: string;
  thumbnail?: string;
  videoId?: string;
}

const MiniMusicPlayer: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [playlist, setPlaylist] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { addToast } = useToast();

  // YouTube Player Ref
  const ytPlayerRef = useRef<YouTubePlayer | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Drag state
  const [position, setPosition] = useState({ x: 20, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  // Mount effect
  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      setPosition({ x: 20, y: window.innerHeight - 140 });
    }
    return () => clearInterval(progressIntervalRef.current as any);
  }, []);

  // YouTube Search - Using our own API endpoint
  const searchYouTube = async (query: string) => {
    if (!query.trim()) return;

    setIsSearching(true);
    setSearchResults([]);

    try {
      const response = await fetch(`/api/music/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        console.error('Search failed:', response.status, response.statusText);
        setSearchResults([]);
        return;
      }
      const data = await response.json();

      // Check for error in response
      if (data.error) {
        console.error('Search API error:', data.error);
        setSearchResults([]);
        return;
      }

      if (data.results && Array.isArray(data.results) && data.results.length > 0) {
        setSearchResults(data.results);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    }

    setIsSearching(false);
  };

  const playTrack = async (track: Track) => {
    if (ytPlayerRef.current) {
      ytPlayerRef.current.pauseVideo();
    }

    // Extract videoId if not present
    let videoId = track.videoId || track.id;
    if (track.url?.includes('v=')) {
      const match = track.url.match(/v=([^&]+)/);
      if (match) videoId = match[1];
    } else if (track.url?.includes('/streams/')) {
      const match = track.url.match(/\/streams\/([^/?]+)/);
      if (match) videoId = match[1];
    }

    const trackWithVideoId = { ...track, videoId };

    // Add to playlist if not exists
    if (!playlist.find(t => t.id === track.id)) {
      setPlaylist(prev => [...prev, trackWithVideoId]);
    }

    setCurrentTrack(trackWithVideoId);
    setCurrentIndex(playlist.findIndex(t => t.id === track.id) || playlist.length);
    setProgress(0);
    setDuration(0);
    setShowSearch(false);
    setIsPlaying(false); // Wait for onReady or onPlay events
  };

  // YouTube Event Handlers
  const onPlayerReady = (event: any) => {
    ytPlayerRef.current = event.target;
    event.target.setVolume(isMuted ? 0 : volume * 100);
    event.target.playVideo();
  };

  const onPlayerStateChange = (event: any) => {
    // 1 = playing, 2 = paused, 0 = ended, 3 = buffering
    if (event.data === 1) {
      setIsPlaying(true);
      setDuration(event.target.getDuration());

      // Setup progress tracking
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = setInterval(() => {
        if (event.target && event.target.getCurrentTime) {
          setProgress(event.target.getCurrentTime());
        }
      }, 500);
    } else {
      setIsPlaying(false);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

      if (event.data === 0) {
        // Track ended
        nextTrack();
      }
    }
  };

  const onPlayerError = (event: any) => {
    console.error('YouTube Player Error:', event.data);
    setIsPlaying(false);
    addToast({ type: 'error', title: 'Playback Error', message: 'Failed to play track. It is likely restricted by YouTube embeddings.' });
  };

  // Update volume
  useEffect(() => {
    if (ytPlayerRef.current) {
      ytPlayerRef.current.setVolume(isMuted ? 0 : volume * 100);
    }
  }, [volume, isMuted]);

  const togglePlay = useCallback(() => {
    if (!currentTrack) {
      setShowSearch(true);
      return;
    }
    if (ytPlayerRef.current) {
      if (isPlaying) {
        ytPlayerRef.current.pauseVideo();
      } else {
        ytPlayerRef.current.playVideo();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying, currentTrack]);

  const nextTrack = useCallback(() => {
    if (playlist.length === 0) return;

    if (ytPlayerRef.current) {
      ytPlayerRef.current.pauseVideo();
    }

    const nextIndex = (currentIndex + 1) % playlist.length;
    setCurrentIndex(nextIndex);
    setCurrentTrack(playlist[nextIndex]);
    setProgress(0);
    setDuration(0);
    setIsPlaying(false);
  }, [playlist, currentIndex]);

  const prevTrack = useCallback(() => {
    if (playlist.length === 0) return;

    if (ytPlayerRef.current) {
      ytPlayerRef.current.pauseVideo();
    }

    const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    setCurrentIndex(prevIndex);
    setCurrentTrack(playlist[prevIndex]);
    setProgress(0);
    setDuration(0);
    setIsPlaying(false);
  }, [playlist, currentIndex]);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (ytPlayerRef.current && duration > 0 && isFinite(duration)) {
      const newTime = percent * duration;
      ytPlayerRef.current.seekTo(newTime, true);
      setProgress(newTime);
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Don't start drag if clicking on controls
    if ((e.target as HTMLElement).closest('.player-controls')) return;
    
    e.preventDefault(); // Prevent text selection while dragging
    
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y
    };
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStart.current.x;
    const deltaY = e.clientY - dragStart.current.y;

    const newX = dragStart.current.posX + deltaX;
    const newY = dragStart.current.posY + deltaY;

    // Constrain to viewport
    const maxX = window.innerWidth - (isExpanded ? 340 : 80);
    const maxY = window.innerHeight - (isExpanded ? 140 : 80);

    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    });
  }, [isDragging, isExpanded]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'm' && e.ctrlKey) {
        e.preventDefault();
        setIsVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isMounted) return null;

  // Nothing is visible until Ctrl+M is pressed
  if (!isVisible) return null;

  return (
    <>
      <div style={{ display: 'none' }}>
        {currentTrack?.videoId && (
          <YouTube
            videoId={currentTrack.videoId}
            opts={{
              height: '0',
              width: '0',
              playerVars: {
                autoplay: 1,
                controls: 0,
                disablekb: 1,
                fs: 0,
                modestbranding: 1,
                rel: 0,
                showinfo: 0,
                iv_load_policy: 3
              }
            }}
            onReady={onPlayerReady}
            onStateChange={onPlayerStateChange}
            onError={onPlayerError}
          />
        )}
      </div>

      <motion.div
        className={`music-player-wrapper ${isDragging ? 'dragging' : ''}`}
        style={{
          left: position.x,
          top: position.y,
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        onMouseDown={handleMouseDown}
      >
        {/* Search dropdown - appears above the player */}
        <AnimatePresence>
          {showSearch && (
            <motion.div
              className="search-dropdown"
              style={{
                left: isExpanded ? (340 - 300) / 2 : (65 - 300) / 2,
              }}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            >
              <GlassSurface
                width="100%"
                height="100%"
                borderRadius={16}
                brightness={60}
                opacity={0.95}
                blur={8}
                displace={1}
                distortionScale={-120}
                redOffset={1}
                greenOffset={4}
                blueOffset={8}
                saturation={1.1}
                backgroundOpacity={0.15}
                className="search-glass"
              >
                <div className="search-content">
                  <div className="search-input-row">
                    <Search size={16} className="search-icon" />
                    <input
                      type="text"
                      placeholder="Search for a song..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && searchYouTube(searchQuery)}
                      autoFocus
                      className="player-controls"
                    />
                    <button type="button" className="search-close player-controls" onClick={() => { setShowSearch(false); setSearchResults([]); setSearchQuery(''); }}>
                      <X size={14} />
                    </button>
                  </div>

                  {(isSearching || searchResults.length > 0 || searchQuery) && (
                    <div className="search-results-mini">
                      {isSearching ? (
                        <div className="search-loading-mini">
                          <Loader2 size={18} className="spin" />
                          <span>Searching...</span>
                        </div>
                      ) : searchResults.length > 0 ? (
                        searchResults.map((track) => (
                          <motion.div
                            key={track.id}
                            className="search-result-mini player-controls"
                            onClick={() => playTrack(track)}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,105,180,0.15)' }}
                            whileTap={{ scale: 0.98 }}
                          >
                            {track.thumbnail ? (
                              <img
                                src={track.thumbnail}
                                alt={track.title}
                                className="result-thumbnail"
                              />
                            ) : (
                              <div className="result-thumbnail-placeholder">
                                <Music size={16} />
                              </div>
                            )}
                            <div className="result-text">
                              <span className="result-title-mini">{track.title}</span>
                              <span className="result-artist-mini">{track.artist}</span>
                            </div>
                            <Play size={14} className="result-play-icon" />
                          </motion.div>
                        ))
                      ) : searchQuery.length > 2 ? (
                        <div className="no-results">Enter ile ara</div>
                      ) : null}
                    </div>
                  )}
                </div>
              </GlassSurface>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          className="player-glass-bounce"
          initial={false}
          animate={{
            width: isExpanded ? 340 : 65,
            height: isExpanded ? 105 : 65,
          }}
          transition={{
            type: 'spring',
            damping: 12,
            stiffness: 200,
            mass: 0.6
          }}
        >
          <GlassSurface
            width="100%"
            height="100%"
            borderRadius={20}
            brightness={55}
            opacity={0.9}
            blur={5}
            displace={2}
            distortionScale={-160}
            redOffset={2}
            greenOffset={8}
            blueOffset={16}
            saturation={1.1}
            backgroundOpacity={0.1}
            className="music-player-glass"
          >
            <AnimatePresence mode="wait">
              {isExpanded ? (
                <motion.div
                  key="expanded"
                  className="player-expanded"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.1 }}
                >
                  {/* Drag handle */}
                  <div className="drag-indicator">
                    <GripHorizontal size={14} />
                  </div>

                  {/* Vinyl Disc */}
                  <motion.div
                    className="vinyl-disc"
                    animate={{ rotate: isPlaying ? 360 : 0 }}
                    transition={{
                      duration: 3,
                      repeat: isPlaying ? Infinity : 0,
                      ease: 'linear',
                      repeatType: 'loop'
                    }}
                  >
                    <Disc3 size={44} className="vinyl-icon" />
                    <div className="vinyl-center">
                      <Music size={14} />
                    </div>
                  </motion.div>

                  {/* Track Info & Controls */}
                  <div className="track-section">
                    <div className="track-info" onClick={() => setShowSearch(true)} style={{ cursor: 'pointer' }}>
                      <div className="track-title">{currentTrack?.title || 'Search Song'}</div>
                      <div className="track-artist">{currentTrack?.artist || 'Search on YouTube'}</div>
                    </div>

                    {/* Progress Bar */}
                    <div className="progress-wrapper player-controls" onClick={handleSeek}>
                      <div className="progress-bg">
                        <motion.div
                          className="progress-fill"
                          style={{ width: `${(progress / duration) * 100 || 0}%` }}
                        />
                      </div>
                      <div className="time-display">
                        <span>{formatTime(progress)}</span>
                        <span>{formatTime(duration)}</span>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="controls-row player-controls">
                      <button type="button" className="ctrl-btn" onClick={() => setShowSearch(true)}>
                        <Search size={14} />
                      </button>
                      <div className="volume-container">
                        <button type="button" className="ctrl-btn" onClick={() => setIsMuted(!isMuted)}>
                          {isMuted || volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
                        </button>
                        <input
                          type="range"
                          className="volume-slider"
                          min="0"
                          max="1"
                          step="0.05"
                          value={isMuted ? 0 : volume}
                          onChange={(e) => {
                            setVolume(parseFloat(e.target.value));
                            setIsMuted(false);
                          }}
                        />
                      </div>
                      <button type="button" className="ctrl-btn" onClick={prevTrack}>
                        <SkipBack size={16} />
                      </button>
                      <button type="button" className="ctrl-btn play-btn" onClick={togglePlay}>
                        {isPlaying ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: 2 }} />}
                      </button>
                      <button type="button" className="ctrl-btn" onClick={nextTrack}>
                        <SkipForward size={16} />
                      </button>
                      <button type="button" className="ctrl-btn collapse-btn" onClick={() => setIsExpanded(false)}>
                        <ChevronLeft size={16} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="collapsed"
                  className="player-collapsed"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.1 }}
                >
                  {/* Clickable emoji - for expand */}
                  <motion.button
                    className="emoji-expand-btn player-controls"
                    onClick={() => setIsExpanded(true)}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {isPlaying ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                      >
                        <Disc3 size={32} className="mini-vinyl" />
                      </motion.div>
                    ) : (
                      <Music size={28} className="mini-music-icon" />
                    )}
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </GlassSurface>
        </motion.div>
      </motion.div>
    </>
  );
};

export default MiniMusicPlayer;
