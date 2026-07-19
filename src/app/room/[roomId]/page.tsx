'use client';

import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { VideoSource, RoomState, QueueItem } from '../../../types';
import { useSocket } from '../../../hooks/useSocket';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { usePokemonTheme } from '@/components/PokemonThemeProvider';
import { useToast } from '@/components/ui/Toast';
import { useBadges } from '@/components/Badges/BadgeProvider';
// import { useAdBlocker } from '@/components/AdBlocker';
import Logo from '@/components/Logo';
import { Users, Search, MessageCircle, Keyboard, Trash2, LogOut, ChevronRight, X, Shield, AlertTriangle, Home } from 'lucide-react';
import { motion } from 'motion/react';
import { useDebounce } from '@/hooks/useDebounce';
import { extractYouTubeVideoId } from '@/lib/youtube';
import { EpisodePicker } from '@/components/room/EpisodePicker';
import { SearchResultsModal } from '@/components/room/SearchResultsModal';
import { UserList } from '@/components/room/UserList';

// Lazy load heavy components to reduce initial bundle size
const VideoPlayer = lazy(() =>
  import('../../../components/room/VideoPlayer')
);

// These components are not immediately visible, so lazy load them

const Chat = lazy(() =>
  import('../../../components/room/Chat').then(m => ({ default: m.Chat }))
);
const InviteLink = lazy(() =>
  import('../../../components/room/InviteLink').then(m => ({ default: m.InviteLink }))
);
const ConfirmModal = lazy(() =>
  import('@/components/ui/ConfirmModal')
);
const WatchlistQueue = lazy(() =>
  import('@/components/room/WatchlistQueue').then(m => ({ default: m.WatchlistQueue }))
);

interface SearchResult {
  id: string;
  url: string;
  title: string;
  thumbnail?: string;
  channel?: string;
  type?: string;
  provider?: 'youtube' | 'vimeo' | 'mp4' | 'movie' | 'iptv';
  numberOfSeasons?: number;
  imdbId?: string;
  isAnime?: boolean;
  country?: string;
  categories?: string[];
  [key: string]: unknown;
}

interface RoomPageProps {
  params: Promise<{
    roomId: string;
  }>;
}

export default function RoomPage({ params: _params }: RoomPageProps) {
  const params = React.use(_params) as { roomId: string };
  const { data: session, status } = useSession();
  const router = useRouter();
  const { currentTheme, isDarkMode } = usePokemonTheme();
  const { addToast } = useToast();
  const { awardBadge, hasBadge, isReady: badgesReady } = useBadges();
  const [guestUser, setGuestUser] = useState<{ id: string, name: string } | null>(null);
  const [hasWatched, setHasWatched] = useState(false);
  const [showAdWarning, setShowAdWarning] = useState(false);
  // isMobile tracks whether the CURRENT viewport matches Tailwind's sm: breakpoint (640px).
  // This is used to decide which layout's VideoPlayer to mount (to prevent duplicate audio).
  // It MUST stay in sync with the CSS sm:hidden / hidden sm:flex classes.
  const [isMobile, setIsMobile] = useState(false);
  const [petInfo, setPetInfo] = useState<{ family: string; name: string } | null>(null);

  // Load pet info on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const family = localStorage.getItem('cinepurr_virtual_pet') || 'charmander';
      const name = localStorage.getItem('cinepurr_virtual_pet_name') || '';
      setPetInfo({ family, name });
    }
  }, []);

  // Detect mobile vs desktop using matchMedia to stay perfectly in sync with Tailwind's sm: breakpoint.
  // This replaces the old UA-based detection which went out of sync on rotation.
  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 640px)');
    
    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      // If viewport >= 640px, we're "desktop" (sm: breakpoint), otherwise "mobile"
      setIsMobile(!e.matches);
    };
    
    // Set initial value
    handleChange(mediaQuery);
    
    // Listen for changes (rotation, resize, etc.)
    mediaQuery.addEventListener('change', handleChange);
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  // AdBlocker disabled - was causing YouTube black screen issues
  // useAdBlocker();

  useEffect(() => {
    if (status === 'unauthenticated' && !guestUser) {
      setGuestUser({
        id: `guest-${Math.random().toString(36).substr(2, 9)}`,
        name: `Guest ${Math.floor(Math.random() * 1000)}`
      });
    }
  }, [status, guestUser]);

  const user = useMemo(() => {
    const baseUser = session?.user ? {
      id: session.user.id || session.user.username || session.user.email || 'unknown',
      name: session.user.name || session.user.username || 'Guest',
      image: session.user.image
    } : guestUser || undefined;

    if (baseUser && petInfo) {
      return {
        ...baseUser,
        petFamily: petInfo.family,
        petName: petInfo.name
      };
    }
    return baseUser;
  }, [session, guestUser, petInfo]);

  // Force socket to re-connect if user changes significantly
  const socket = useSocket(params.roomId, user);

  // Achievement: First room join is handled on the server (roomsJoined)
  // Here we check for time-based achievements
  useEffect(() => {
    // Wait for badges to be loaded before checking/awarding
    if (!badgesReady || !session || hasWatched) return;

    const hour = new Date().getHours();

    // Night Owl - watching after midnight (00:00 - 04:00)
    if (hour >= 0 && hour < 4 && !hasBadge('night-owl')) {
      awardBadge('night-owl', 'Night Owl', 'Watch after midnight', '🦉');
    }

    // Early Bird - watching before 6 AM (04:00 - 06:00)
    if (hour >= 4 && hour < 6 && !hasBadge('early-bird')) {
      awardBadge('early-bird', 'Early Bird', 'Watch before 6 AM', '🐦');
    }

    // First Watch achievement when video starts playing
    if (!hasBadge('first-watch')) {
      awardBadge('first-watch', 'First Watch', 'Watch your first video together', '👀');
    }

    setHasWatched(true);
  }, [session, hasWatched, hasBadge, awardBadge, badgesReady]);

  // Debug logging (removed - use browser DevTools or server logs instead)
  // Production builds strip console.log via next.config.js compiler option

  const [videoSource, setVideoSource] = useState<VideoSource>({
    url: '',
    title: '',
    provider: 'youtube',
  });
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [newUrl, setNewUrl] = useState('');
  const [hostId, setHostId] = useState<string | undefined>(undefined);
  const [coHostIds, setCoHostIds] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [searchType, setSearchType] = useState<'youtube' | 'movies' | 'livetv'>('youtube');
  const [selectedTvShow, setSelectedTvShow] = useState<SearchResult | null>(null); // For episode picker
  const [cinemaMode, setCinemaMode] = useState(false); // Cinema mode dims UI except video

  // Mobile tab state
  const [mobileTab, setMobileTab] = useState<'chat' | 'search' | 'users'>('chat');

  // Debounce search input to reduce API calls
  const debouncedSearchQuery = useDebounce(newUrl, 500);

  const isHost = useMemo(() => hostId === user?.id, [hostId, user?.id]);

  // Co-host check - user is in the coHostIds array
  const isCoHost = useMemo(() => coHostIds.includes(user?.id || ''), [coHostIds, user?.id]);

  // Fetch hostId from REST API as a fallback (socket player:sync may arrive late)
  useEffect(() => {
    if (hostId || !params.roomId) return; // Already have hostId from socket
    fetch(`/api/rooms/${params.roomId}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.hostId && !hostId) {
          setHostId(data.hostId);
        }
      })
      .catch(() => {}); // Silently fail - socket sync will eventually provide it
  }, [params.roomId, hostId]);

  // Custom modal state for delete confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteRoom = () => {
    setShowDeleteModal(true);
  };

  const confirmDeleteRoom = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/rooms/${params.roomId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        // Notify Socket.io server to remove room from memory and notify all users
        if (socket?.connected) {
          socket.emit('room:delete', { roomId: params.roomId });
        }
        addToast({ type: 'success', title: 'Room Deleted', message: 'Room deleted successfully!' });
        router.push('/');
      } else {
        const data = await res.json();
        addToast({ type: 'error', title: 'Error', message: data.error || 'Failed to delete room' });
      }
    } catch (_error) {
      addToast({ type: 'error', title: 'Error', message: 'Failed to delete room' });
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setShowShortcuts(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Guests are allowed to join rooms; we generate a guest identity above.

  useEffect(() => {
    if (!socket) return;

    const handlePlayerSyncForPage = (state: RoomState) => {
      if (state.hostId) {
        setHostId(state.hostId);
      }
      if (Array.isArray((state as unknown as { coHostIds?: string[] }).coHostIds)) {
        setCoHostIds((state as unknown as { coHostIds: string[] }).coHostIds);
      }
      // Only update video source if it's actually different (prevents unnecessary re-renders)
      if (state.currentVideo && state.currentVideo.url) {
        setVideoSource(prev => {
          // For YouTube videos, compare by video ID to avoid refreshes from URL format differences
          if (state.currentVideo!.provider === 'youtube' || state.currentVideo!.url.includes('youtube.com') || state.currentVideo!.url.includes('youtu.be')) {
            const prevVideoId = extractYouTubeVideoId(prev.url || '');
            const newVideoId = extractYouTubeVideoId(state.currentVideo!.url);
            // Only update if video ID changed (different video) or title changed
            if (prevVideoId !== newVideoId || prev.title !== state.currentVideo!.title) {
              return state.currentVideo!;
            }
          } else {
            // For non-YouTube videos, compare URLs directly
            const prevUrl = prev.url?.trim().toLowerCase() || '';
            const newUrl = state.currentVideo!.url?.trim().toLowerCase() || '';
            if (prevUrl !== newUrl || prev.title !== state.currentVideo!.title) {
              return state.currentVideo!;
            }
          }
          return prev; // Return previous value to prevent re-render
        });
      }
    };
    socket.on('player:sync', handlePlayerSyncForPage);

    socket.on('room:kicked', () => {
      addToast({ type: 'warning', title: 'Kicked', message: 'You have been kicked from the room.' });
      router.push('/');
    });

    socket.on('room:error', ({ message, code }: { message: string; code?: string }) => {
      console.error('[SOCKET ERROR]', code, message);
      addToast({ type: 'error', title: code || 'Room Error', message: message || 'An unknown error occurred' });
      
      if (code === 'ROOM_NOT_FOUND') {
        router.push('/');
      } else if (code === 'ROOM_FULL') {
        router.push('/');
      }
    });

    socket.on('room:deleted', ({ message }: { message: string }) => {
      addToast({ type: 'warning', title: 'Room Deleted', message: message || 'The host has deleted this room.' });
      router.push('/');
    });

    socket.on('room:video_changed', (video: VideoSource) => {
      // Only update if video actually changed (prevents unnecessary refreshes)
      setVideoSource(prev => {
        // For YouTube videos, compare by video ID to avoid refreshes from URL format differences
        if (video.provider === 'youtube' || video.url.includes('youtube.com') || video.url.includes('youtu.be')) {
          const prevVideoId = extractYouTubeVideoId(prev.url || '');
          const newVideoId = extractYouTubeVideoId(video.url);
          // Only update if video ID changed (different video) or title changed
          if (prevVideoId !== newVideoId || prev.title !== video.title) {
            return video;
          }
        } else {
          // For non-YouTube videos, compare URLs directly
          const prevUrl = prev.url?.trim().toLowerCase() || '';
          const newUrl = video.url?.trim().toLowerCase() || '';
          if (prevUrl !== newUrl || prev.title !== video.title) {
            return video;
          }
        }
        return prev; // Return previous value to prevent re-render
      });
    });

    // Synced Watchlist — queue updates from other users
    socket.on('room:queue_update', (updatedQueue: QueueItem[]) => {
      setQueue(updatedQueue || []);
    });

    socket.on('room:cohost_updated', ({ coHostIds: updated }: { coHostIds: string[] }) => {
      setCoHostIds(updated || []);
    });

    socket.on('room:host_changed', ({ hostId: newHostId }: { hostId: string }) => {
      setHostId(newHostId);
    });

    // Host receives control requests from viewers
    socket.on('room:control_requested', ({ userId, username }: { userId: string; username: string }) => {
      addToast({
        type: 'info',
        title: '🎮 Control Request',
        message: `${username} wants control of the video`,
        action: {
          label: 'Approve',
          onClick: () => {
            socket.emit('room:grant-control', { roomId: params.roomId, targetUserId: userId });
          },
        },
        duration: 15000,
      });
    });

    // Viewer gets notified when granted control
    socket.on('room:control_granted', () => {
      addToast({
        type: 'success',
        title: '🎮 Control Granted',
        message: 'You now have co-host control! You can play, pause, and seek.',
      });
    });

    // ── RACE CONDITION FIX ─────────────────────────────────────────
    // On client-side navigation (no hard refresh), the server may
    // have already broadcast state before these listeners attached.
    // Use room:request_full_state for atomic recovery instead of
    // 3 separate requests (which competed with each other).
    let raceFixTimeout: ReturnType<typeof setTimeout> | undefined;
    if (socket.connected) {
      raceFixTimeout = setTimeout(() => {
        socket.emit('room:request_full_state', { roomId: params.roomId }, (response?: any) => {
          if (response?.ok) {
            if (response.hostId) setHostId(response.hostId);
            if (Array.isArray(response.coHostIds)) setCoHostIds(response.coHostIds);
            if (response.currentVideo?.url) {
              setVideoSource(response.currentVideo);
            }
            if (Array.isArray(response.queue)) {
              setQueue(response.queue);
            }
          }
        });
      }, 1000);
    }

    return () => {
      if (raceFixTimeout) clearTimeout(raceFixTimeout);
      socket.off('player:sync', handlePlayerSyncForPage);
      socket.off('room:kicked');
      socket.off('room:error');
      socket.off('room:deleted');
      socket.off('room:video_changed');
      socket.off('room:queue_update');
      socket.off('room:cohost_updated');
      socket.off('room:host_changed');
      socket.off('room:control_requested');
      socket.off('room:control_granted');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, router]); // Removed videoSource.url from dependencies to prevent effect re-running

  // Memoize search function - now uses secure backend API
  // Accepts AbortSignal to cancel in-flight requests
  const searchMovies = useCallback(async (query: string, signal?: AbortSignal) => {
    try {
      const res = await fetch(`/api/movies?q=${encodeURIComponent(query)}`, { signal });
      if (!res.ok) {
        throw new Error(`API returned ${res.status}`);
      }
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      // Don't log abort errors - they're expected when user types fast
      if (error instanceof Error && error.name === 'AbortError') {
        return [];
      }
      console.error('Movie search error:', error);
      return [];
    }
  }, []);

  // Auto-search when debounced query changes (for better UX)
  // Uses AbortController to cancel previous requests when query changes
  useEffect(() => {
    if (!debouncedSearchQuery || debouncedSearchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    // Check if it's a URL - don't auto-search URLs
    if (debouncedSearchQuery.match(/^(http(s)?:\/\/)?((w){3}.)?youtu(be|.be)?(\.com)?\/.+/)) {
      return;
    }

    // Create AbortController to cancel request if query changes
    const abortController = new AbortController();

    // Auto-search after debounce
    const performSearch = async () => {
      setIsSearching(true);
      setShowResults(true);
      try {
        let data;
        if (searchType === 'movies') {
          data = await searchMovies(debouncedSearchQuery, abortController.signal);
        } else {
          const res = await fetch(
            `/api/search?q=${encodeURIComponent(debouncedSearchQuery)}&type=${searchType}`,
            { signal: abortController.signal }
          );
          if (!res.ok) {
            console.error('Search failed:', res.status, res.statusText);
            setSearchResults([]);
            return;
          }
          data = await res.json();

          // Check for error in response
          if (data.error) {
            console.error('Search API error:', data.error);
            setSearchResults([]);
            return;
          }
        }

        // Only update if not aborted
        if (!abortController.signal.aborted) {
          // Ensure data is an array
          if (Array.isArray(data)) {
            setSearchResults(data);
          } else if (data && Array.isArray(data.results)) {
            setSearchResults(data.results);
          } else {
            setSearchResults([]);
          }
        }
      } catch (err) {
        // Don't log abort errors - they're expected
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        console.error('Search error:', err);
        setSearchResults([]);
      } finally {
        if (!abortController.signal.aborted) {
          setIsSearching(false);
        }
      }
    };

    performSearch();

    // Cleanup: abort request when effect re-runs or component unmounts
    return () => {
      abortController.abort();
    };
  }, [debouncedSearchQuery, searchType, searchMovies]);

  const handleSearchOrPlay = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl) return;

    // Check if it&apos;s a YouTube URL or video ID
    const { normalizeYouTubeUrl, isValidYouTubeUrl } = await import('@/lib/youtube');
    const normalizedUrl = normalizeYouTubeUrl(newUrl);

    if (normalizedUrl || isValidYouTubeUrl(newUrl)) {
      // Direct URL flow should add to queue (tests expect queue entry), not force immediate playback.
      const finalUrl = normalizedUrl || newUrl;
      let resolvedTitle = 'YouTube Video';
      let resolvedThumbnail: string | undefined;

      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(finalUrl)}&type=youtube`);
        if (res.ok) {
          const results = await res.json();
          const list = Array.isArray(results) ? results : [];
          const submittedVideoId = extractYouTubeVideoId(finalUrl);

          // Prefer exact video-id match if available to avoid noisy URL-string search results.
          const exact = list.find((item: SearchResult) => {
            const candidateId = extractYouTubeVideoId(item.url || '');
            return submittedVideoId && candidateId === submittedVideoId;
          });

          const best = exact || list[0];
          if (best) {
            resolvedTitle = best.title || resolvedTitle;
            resolvedThumbnail = best.thumbnail;
          }
        }
      } catch {
        // Keep fallback title/thumbnail if metadata lookup fails.
      }

      socket?.emit('room:queue_add', {
        roomId: params.roomId,
        video: {
          url: finalUrl,
          title: resolvedTitle,
          provider: 'youtube',
          thumbnail: resolvedThumbnail,
        },
      });

      setNewUrl('');
      setSearchResults([]);
      setShowResults(false);
    } else {
      // Trigger search (will be handled by debounced effect)
      // Or perform immediate search if user explicitly submits
      setIsSearching(true);
      setShowResults(true);
      try {
        let data;
        if (searchType === 'movies') {
          data = await searchMovies(newUrl);
        } else {
          const res = await fetch(`/api/search?q=${encodeURIComponent(newUrl)}&type=${searchType}`);
          data = await res.json();
        }
        if (Array.isArray(data)) {
          setSearchResults(data);
        } else if (data && Array.isArray(data.results)) {
          setSearchResults(data.results);
        } else {
          setSearchResults([]);
        }
      } catch (err) {
        console.error('Search error:', err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }
  }, [newUrl, searchType, socket, params.roomId, searchMovies]);

  const playVideo = (video: SearchResult) => {
    // If it&apos;s a TV show, show episode picker
    if (video.type === 'tv' && video.numberOfSeasons) {
      setShowResults(false); // Close search results so episode picker is on top
      setSelectedTvShow(video);
      return;
    }

    const newVideo: VideoSource = {
      url: video.url,
      title: video.title,
      provider: video.provider || 'youtube',
    };
    setVideoSource(newVideo);
    socket?.emit('room:change_video', { roomId: params.roomId, video: newVideo });
    setNewUrl('');
    setSearchResults([]);
    setShowResults(false);

    // Show ad warning for movie embeds
    if (video.provider === 'movie') {
      setShowAdWarning(true);
      setTimeout(() => setShowAdWarning(false), 8000);
    }
  };

  const addToQueue = (video: SearchResult) => {
    socket?.emit('room:queue_add', {
      roomId: params.roomId,
      video: {
        url: video.url,
        title: video.title,
        provider: video.provider || 'youtube',
        thumbnail: video.thumbnail,
      },
    });
  };

  // Play specific episode using IMDb ID
  const playEpisode = (season: number, episode: number, source: string = 'vidsrc') => {
    if (!selectedTvShow) return;

    // Use IMDb ID for VidSrc
    const imdbId = selectedTvShow.imdbId || selectedTvShow.id;
    let url = '';

    switch (source) {
      case 'vidbinge': url = `https://vidbinge.dev/embed/tv/${imdbId}/${season}/${episode}`; break;
      case 'vidsrcxyz': url = `https://vidsrc.xyz/embed/tv?tmdb=${imdbId}&season=${season}&episode=${episode}`; break;
      case '2embed': url = `https://2embed.cc/embed/tv/${imdbId}/${season}/${episode}`; break;
      case 'vidsrc':
      default: url = `https://vidsrc.cc/v2/embed/tv/${imdbId}/${season}/${episode}`; break;
    }

    const newVideo: VideoSource = {
      url,
      title: `${selectedTvShow.originalTitle || selectedTvShow.title} - S${season}E${episode}`,
      provider: 'movie',
    };

    setVideoSource(newVideo);
    socket?.emit('room:change_video', { roomId: params.roomId, video: newVideo });
    setNewUrl('');
    setSearchResults([]);
    setShowResults(false);
    setSelectedTvShow(null);
  };

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center text-2xl font-bold text-[#ff69b4] animate-pulse">Loading...</div>;
  }

  // Allow render if we have a user (either session or guest)
  if (!user) {
    return null;
  }

  // Mobile Tab Content — rendered inline (NOT as <MobileTabContent />) to avoid
  // React treating it as a new component on every render, which would unmount/remount Chat
  const renderMobileTabContent = () => {
    switch (mobileTab) {
      case 'chat':
        return (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Queue panel on mobile */}
            {queue.length > 0 && (
              <div className="shrink-0">
                <Suspense fallback={null}>
                  <WatchlistQueue
                    roomId={params.roomId}
                    socket={socket}
                    queue={queue}
                    isHost={isHost}
                    username={user.name}
                  />
                </Suspense>
              </div>
            )}
            <Chat roomId={params.roomId} socket={socket} username={user.name} />
          </div>
        );
      case 'search':
        return (
          <div className="flex-1 flex flex-col p-3 overflow-y-auto">
            {/* Search Type Tabs */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setSearchType('youtube')}
                className={`flex-1 py-1.5 px-2 text-[10px] font-bold rounded-xl transition-all ${searchType === 'youtube'
                  ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                  : isDarkMode
                    ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
              >
                🎬 YouTube
              </button>
              <button
                onClick={() => setSearchType('movies')}
                className={`flex-1 py-1.5 px-2 text-[10px] font-bold rounded-xl transition-all ${searchType === 'movies'
                  ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20'
                  : isDarkMode
                    ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
              >
                🎥 Movies
              </button>

              <button
                onClick={() => setSearchType('livetv')}
                className={`flex-1 py-1.5 px-2 text-[10px] font-bold rounded-xl transition-all ${searchType === 'livetv'
                  ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                  : isDarkMode
                    ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
              >
                📡 Live TV
              </button>
            </div>

            {/* Search Input */}
            <form onSubmit={handleSearchOrPlay} className="flex gap-2 mb-4">
              <input
                type="text"
                inputMode="search"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                placeholder={
                  searchType === 'movies' ? "Search movies, TV & anime..." :
                    searchType === 'livetv' ? "Search global channels..." :
                      "Search YouTube..."
                }
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                onFocus={(e) => e.target.select()}
                className={`flex-1 px-4 py-3 rounded-xl text-base border-2 ${isDarkMode
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                  : 'bg-white border-gray-200 text-black placeholder-gray-400'
                  }`}
              />
              <button
                type="submit"
                disabled={isSearching}
                className="px-5 py-3 rounded-xl text-white font-bold disabled:opacity-50"
                style={{ backgroundColor: currentTheme.colors.primary }}
              >
                {isSearching ? '...' : '🔍'}
              </button>
            </form>

            {/* Search Results Inline */}
            {searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.slice(0, 10).map((video, index) => (
                  <motion.div
                    key={video.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => playVideo(video)}
                    className={`flex gap-3 p-3 rounded-xl cursor-pointer active:scale-[0.98] transition-all ${isDarkMode ? 'bg-gray-800 active:bg-gray-700' : 'bg-gray-50 active:bg-pink-50'
                      }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={video.thumbnail || 'https://via.placeholder.com/96x64?text=No+Image'}
                      alt={video.title}
                      loading="lazy"
                      className="w-24 h-16 object-cover rounded-lg"
                    />
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-bold line-clamp-2 ${isDarkMode ? 'text-white' : 'text-black'}`}>
                        {video.title}
                      </div>
                      {video.channel && (
                        <div className={`text-xs mt-1 ${isDarkMode ? 'text-pink-400' : 'text-pink-600'}`}>
                          {video.channel}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        {video.type && (
                          <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full text-white ${video.type === 'tv' ? 'bg-blue-500' : 'bg-purple-500'}`}>
                            {video.type === 'tv' ? '📺 TV' : '🎬 Movie'}
                          </span>
                        )}
                        {video.type !== 'tv' && video.type !== 'livetv' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              addToQueue(video);
                            }}
                            className={`text-[10px] font-bold px-1.5 py-0.5 border rounded flex items-center gap-0.5 transition-colors ${isDarkMode
                              ? 'border-pink-500/40 text-pink-400 hover:bg-pink-500/10'
                              : 'border-pink-300 text-pink-600 hover:bg-pink-50'
                              }`}
                          >
                            + Queue
                          </button>
                        )}
                      </div>
                    </div>
                    <ChevronRight className={`shrink-0 self-center ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} size={20} />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        );
      case 'users':
        return (
          <div className="flex-1 p-3 overflow-y-auto">
            <UserList socket={socket} roomId={params.roomId} hostId={hostId} currentUserId={user?.id} coHostIds={coHostIds} />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      {/* ====== MOBILE LAYOUT ====== */}
      <main
        className={`sm:hidden flex flex-col h-screen min-h-[100dvh] max-h-[100dvh] overflow-hidden ${isDarkMode ? 'bg-gray-950' : 'bg-gray-50'}`}
      >
        {/* Mobile Header - Minimal */}
        <header
          className={`h-12 flex items-center justify-between px-3 shrink-0 ${isDarkMode ? 'bg-black border-b border-white/10' : 'bg-white border-b border-gray-200'}`}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/')}
              className={`p-1.5 rounded-lg ${isDarkMode ? 'text-white/70 active:bg-white/10' : 'text-gray-500 active:bg-gray-100'}`}
            >
              <Home size={20} />
            </button>
            <span className={`text-xs font-mono ${isDarkMode ? 'text-pink-400' : 'text-pink-600'}`}>
              #{params.roomId.substring(0, 6)}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <InviteLink roomId={params.roomId} />
            {isHost ? (
              <button
                onClick={handleDeleteRoom}
                className="p-2 rounded-lg bg-red-500/10 text-red-500 active:bg-red-500/20"
                disabled={isDeleting}
              >
                <Trash2 size={18} />
              </button>
            ) : (
              <button
                onClick={() => router.push('/')}
                className="p-2 rounded-lg bg-red-500/10 text-red-500 active:bg-red-500/20"
              >
                <LogOut size={18} />
              </button>
            )}
          </div>
        </header>

        <div className={`px-3 py-2 shrink-0 ${isDarkMode ? 'bg-gray-900 border-b border-white/10' : 'bg-white border-b border-gray-200'}`}>
          <p className={`text-xs font-black uppercase tracking-wide ${isDarkMode ? 'text-white' : 'text-black'}`}>
            Video player
          </p>
        </div>

        {/* Mobile Video Player - Fixed aspect ratio - Only render on mobile to prevent duplicate audio */}
        <div className={`w-full aspect-video shrink-0 ${isDarkMode ? 'bg-black' : 'bg-gray-900'}`}>
          {/* KEY FIX: Use stable key to prevent VideoPlayer unmount/remount when isMobile changes */}
          {isMobile && (
            <Suspense fallback={
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin"></div>
              </div>
            }>
              <VideoPlayer
                key="video-player"
                roomId={params.roomId}
                videoSource={videoSource}
                isHost={isHost}
                isCoHost={isCoHost}
                socket={socket}
                queue={queue}
                onQueueUpdate={setQueue}
                onCinemaModeChange={setCinemaMode}
              />
            </Suspense>
          )}
        </div>

        {/* Video Title Bar */}
        {videoSource.title && (
          <div className={`px-3 py-2 shrink-0 ${isDarkMode ? 'bg-gray-900/80' : 'bg-white'}`}>
            <p className={`text-xs font-medium truncate ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              ▶ {videoSource.title}
            </p>
          </div>
        )}

        {/* Mobile Tab Content Area */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {renderMobileTabContent()}
        </div>

        {/* Mobile Bottom Tab Bar */}
        <nav
          className={`shrink-0 flex items-center justify-around py-2 border-t ${isDarkMode ? 'bg-black border-white/10' : 'bg-white border-gray-200'}`}
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          {[
            { id: 'chat' as const, icon: MessageCircle, label: 'Chat' },
            { id: 'search' as const, icon: Search, label: 'Search' },
            { id: 'users' as const, icon: Users, label: 'Users' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = mobileTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setMobileTab(tab.id)}
                className={`flex flex-col items-center py-1 px-6 rounded-xl transition-all ${isActive ? '' : 'opacity-50'
                  }`}
              >
                <div className={`p-2 rounded-xl ${isActive ? 'bg-pink-500/20' : ''}`}>
                  <Icon
                    size={22}
                    style={{ color: isActive ? currentTheme.colors.primary : isDarkMode ? '#fff' : '#000' }}
                  />
                </div>
                <span
                  className={`text-[10px] font-bold mt-0.5 ${isDarkMode ? 'text-white' : 'text-black'}`}
                  style={{ color: isActive ? currentTheme.colors.primary : undefined }}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Delete Modal */}
        {showDeleteModal && (
          <ConfirmModal
            open={showDeleteModal}
            title="Delete Room?"
            message="Are you sure you want to delete this room? This action cannot be undone."
            confirmText={isDeleting ? 'Deleting...' : 'Delete'}
            cancelText="Cancel"
            onConfirm={confirmDeleteRoom}
            onCancel={() => setShowDeleteModal(false)}
            isDarkMode={isDarkMode}
          />
        )}

        {/* TV Show Episode Picker Modal */}
        {selectedTvShow && (
          <EpisodePicker
            show={selectedTvShow}
            onSelect={playEpisode}
            onClose={() => setSelectedTvShow(null)}
            isDarkMode={isDarkMode}
          />
        )}

        {/* Search Results Modal - Only for URL paste */}
        {showResults && mobileTab !== 'search' && (
          <SearchResultsModal
            results={searchResults}
            searchType={searchType}
            onSelect={playVideo}
            onAddToQueue={addToQueue}
            onClose={() => setShowResults(false)}
            isDarkMode={isDarkMode}
            isSearching={isSearching}
            query={newUrl || debouncedSearchQuery}
          />
        )}
      </main>

      {/* ====== DESKTOP LAYOUT ====== */}
      <main
        className={`hidden sm:flex flex-col p-2 sm:p-4 transition-all duration-500 h-screen min-h-[100dvh] max-h-[100dvh] overflow-hidden ${cinemaMode ? 'cinema-mode' : ''}`}
        style={{
          background: isDarkMode ? 'transparent' : currentTheme.colors.background,
        }}
      >
        {/* Cinema Mode Overlay - Dims everything except video */}
        {cinemaMode && (
          <div className="fixed inset-0 bg-black/80 z-40 pointer-events-none transition-opacity duration-300" />
        )}

        {/* Ad Warning Banner */}
        {showAdWarning && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-bounce-in">
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 shadow-lg ${isDarkMode ? 'bg-yellow-900/90 border-yellow-500 text-yellow-100' : 'bg-yellow-100 border-yellow-500 text-yellow-900'}`}>
              <Shield className="text-yellow-500 shrink-0" size={24} />
              <div className="text-sm">
                <p className="font-bold flex items-center gap-2">
                  <AlertTriangle size={16} /> Film/TV Koruma Aktif
                </p>
                <p className="text-xs opacity-80">Popup ve reklamlar engelleniyor. Yine de dikkatli ol! 🛡️</p>
              </div>
              <button
                onClick={() => setShowAdWarning(false)}
                className="ml-2 p-1 hover:bg-yellow-500/20 rounded"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col gap-4 min-h-0 overflow-hidden">

          {/* Header */}
          <header
            className={`h-12 sm:h-16 flex items-center justify-between px-2 sm:px-6 border-b-2 sm:border-b-4 shrink-0 transition-colors duration-300 ${isDarkMode ? 'border-white' : 'border-black'}`}
            style={{ backgroundColor: isDarkMode ? 'black' : 'white', borderTopWidth: '3px', borderTopColor: currentTheme.colors.primary }}
          >
            {/* Left - Logo */}
            <div className="flex items-center gap-1 sm:gap-2">
              <Logo size="sm" className="sm:hidden" />
              <Logo size="md" className="hidden sm:block" />
              <span className="text-[10px] sm:text-base font-mono" style={{ color: currentTheme.colors.primary }}>
                #{params.roomId.substring(0, 6)}
              </span>
            </div>

            {/* Right - Profile & Actions */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Profile Avatar */}
              <div
                className={`relative group cursor-pointer`}
                onClick={() => router.push(`/profile/${user.name}`)}
              >
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 overflow-hidden transition-transform hover:scale-105 ${isDarkMode ? 'border-white' : 'border-black'}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/avatar/${user.name}`}
                    alt={user.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${user.name}`;
                    }}
                  />
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-2 sm:w-3 h-2 sm:h-3 bg-green-500 rounded-full border ${isDarkMode ? 'border-black' : 'border-white'}`} />
              </div>

              {/* Invite Button */}
              <InviteLink roomId={params.roomId} />

              {/* Keyboard Shortcuts - Hidden on mobile */}
              <button
                onClick={() => setShowShortcuts(true)}
                className={`hidden sm:block p-1.5 sm:p-2 border-2 active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all ${isDarkMode ? 'bg-gray-700 text-white border-white shadow-[2px_2px_0px_0px_rgba(255,255,255,0.5)]' : 'bg-gray-100 text-black border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'}`}
                title="Keyboard Shortcuts (?)"
              >
                <Keyboard size={18} />
              </button>

              {/* Leave Room / Delete Room */}
              {isHost ? (
                <button
                  onClick={handleDeleteRoom}
                  className={`p-1.5 sm:p-2 bg-red-500 text-white border-2 active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all hover:bg-red-600 ${isDarkMode ? 'border-white shadow-[2px_2px_0px_0px_rgba(255,255,255,0.5)]' : 'border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'}`}
                  title="Delete Room"
                  disabled={isDeleting}
                >
                  <Trash2 size={16} className="sm:w-[18px] sm:h-[18px]" />
                </button>
              ) : (
                <button
                  onClick={() => router.push('/')}
                  className={`p-1.5 sm:p-2 bg-red-500 text-white border-2 active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all hover:bg-red-600 ${isDarkMode ? 'border-white shadow-[2px_2px_0px_0px_rgba(255,255,255,0.5)]' : 'border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'}`}
                  title="Leave Room"
                >
                  <LogOut size={16} className="sm:w-[18px] sm:h-[18px]" />
                </button>
              )}
              {/* Delete Room Modal */}
              {showDeleteModal && (
                <ConfirmModal
                  open={showDeleteModal}
                  title="Delete Room?"
                  message="Are you sure you want to delete this room? This action cannot be undone."
                  confirmText={isDeleting ? 'Deleting...' : 'Delete'}
                  cancelText="Cancel"
                  onConfirm={confirmDeleteRoom}
                  onCancel={() => setShowDeleteModal(false)}
                  isDarkMode={isDarkMode}
                />
              )}
            </div>
          </header>

          <div className="flex-1 flex gap-2 sm:gap-4 flex-col lg:flex-row overflow-hidden" style={{ minHeight: 0 }}>
            {/* Main Content Area - Video Player - z-50 to be above cinema overlay - Only render on desktop to prevent duplicate audio */}
            <div className={`flex-1 lg:flex-[3] flex flex-col justify-center relative ${cinemaMode ? 'z-50' : ''}`} style={{ minHeight: '200px', maxHeight: '100%' }}>
              <div className={`mb-2 px-3 py-2 border-2 ${isDarkMode ? 'border-white bg-black text-white' : 'border-black bg-white text-black'}`}>
                <h2 className="text-sm font-black uppercase tracking-wide">Video player</h2>
              </div>
              {/* KEY FIX: Use stable key to prevent VideoPlayer unmount/remount when isMobile changes */}
              {!isMobile && (
                <Suspense fallback={
                  <div className="w-full aspect-video flex items-center justify-center bg-black">
                    <div className="text-center">
                      <div className="w-16 h-16 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-white text-lg font-bold">Loading player...</p>
                    </div>
                  </div>
                }>
                  <VideoPlayer
                    key="video-player"
                    roomId={params.roomId}
                    videoSource={videoSource}
                    isHost={isHost}
                    isCoHost={isCoHost}
                    socket={socket}
                    queue={queue}
                    onQueueUpdate={setQueue}
                    onCinemaModeChange={setCinemaMode}
                  />

                </Suspense>
              )}
            </div>

            {/* Sidebar (Chat & Controls) */}
            <div className="flex flex-col gap-2 sm:gap-4 min-w-0 lg:min-w-[320px] lg:max-w-[400px] lg:flex-1 h-full" style={{ minHeight: 0, maxHeight: '100%' }}>
              {/* User List - Collapsible on mobile */}
              <div
                className="h-[100px] sm:h-[180px] shrink-0 pixel-box p-1 sm:p-2 overflow-hidden flex flex-col transition-colors"
                style={{ backgroundColor: isDarkMode ? 'black' : 'white' }}
              >
                <h3 className={`font-bold border-b-2 mb-1 sm:mb-2 px-1 sm:px-2 flex items-center gap-1 sm:gap-2 text-xs sm:text-base ${isDarkMode ? 'text-white border-white' : 'text-black border-black'}`}><Users size={12} className="sm:w-5 sm:h-5" /> Users</h3>
                <div className="flex-1 overflow-y-auto min-h-0">
                  <UserList socket={socket} roomId={params.roomId} hostId={hostId} currentUserId={user?.id} coHostIds={coHostIds} />
                </div>
              </div>

              {/* Change Video Control */}
              <div
                className="pixel-box p-2 sm:p-4 shrink-0 relative transition-colors"
                style={{ backgroundColor: isDarkMode ? 'black' : '#fff0f5' }}
                data-tour="search"
              >
                <h3 className={`font-bold mb-2 flex items-center gap-2 text-sm sm:text-base ${isDarkMode ? 'text-white' : 'text-black'}`}>
                  <Search size={16} className="sm:w-5 sm:h-5" /> Search or Paste URL
                </h3>

                {/* Search Type Tabs */}
                <div className="flex gap-1 sm:gap-2 mb-2 sm:mb-3">
                  <button
                    onClick={() => setSearchType('youtube')}
                    className={`flex-1 py-1 sm:py-1.5 px-2 sm:px-3 text-[10px] sm:text-xs font-bold border-2 transition-all ${searchType === 'youtube'
                      ? 'bg-red-500 text-white border-red-600 shadow-lg shadow-red-500/20'
                      : isDarkMode
                        ? 'bg-gray-800 text-gray-400 border-gray-600 hover:bg-gray-700'
                        : 'bg-gray-100 text-gray-500 border-gray-300 hover:bg-gray-200'
                      }`}
                  >
                    🎬 YouTube
                  </button>
                  <button
                    onClick={() => setSearchType('movies')}
                    className={`flex-1 py-1 sm:py-1.5 px-2 sm:px-3 text-[10px] sm:text-xs font-bold border-2 transition-all ${searchType === 'movies'
                      ? 'bg-purple-500 text-white border-purple-600 shadow-lg shadow-purple-500/20'
                      : isDarkMode
                        ? 'bg-gray-800 text-gray-400 border-gray-600 hover:bg-gray-700'
                        : 'bg-gray-100 text-gray-500 border-gray-300 hover:bg-gray-200'
                      }`}
                  >
                    🎥 Movies
                  </button>

                  <button
                    onClick={() => setSearchType('livetv')}
                    className={`flex-1 py-1 sm:py-1.5 px-2 sm:px-3 text-[10px] sm:text-xs font-bold border-2 transition-all ${searchType === 'livetv'
                      ? 'bg-sky-500 text-white border-sky-600 shadow-lg shadow-sky-500/20'
                      : isDarkMode
                        ? 'bg-gray-800 text-gray-400 border-gray-600 hover:bg-gray-700'
                        : 'bg-gray-100 text-gray-500 border-gray-300 hover:bg-gray-200'
                      }`}
                  >
                    📡 Live TV
                  </button>
                </div>

                <form onSubmit={handleSearchOrPlay} className="flex gap-1 sm:gap-2">
                  <input
                    type="text"
                    placeholder={
                      searchType === 'movies' ? "Search movies, TV & anime..." :
                        searchType === 'livetv' ? "Search global channels..." :
                          "Search YouTube..."
                    }
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    className="pixel-input flex-1 text-base sm:text-sm w-full min-w-0 py-2.5 sm:py-2"
                  />
                  <button
                    type="submit"
                    disabled={isSearching}
                    className="pixel-btn px-4 py-2.5 sm:px-4 sm:py-2 text-sm font-bold disabled:opacity-50 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all min-w-[48px] min-h-[44px]"
                    style={{ backgroundColor: currentTheme.colors.primary }}
                  >
                    {isSearching ? '...' : 'Go'}
                  </button>
                </form>

                {/* Inline Search Results (Desktop) */}
                {searchResults.length > 0 && (
                  <div className="mt-2 max-h-[300px] overflow-y-auto space-y-1">
                    {searchResults.slice(0, 10).map((video, index) => (
                      <motion.div
                        key={video.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        onClick={() => playVideo(video)}
                        className={`flex gap-2 p-2 rounded-lg cursor-pointer active:scale-[0.98] transition-all ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-50 hover:bg-pink-50'
                          }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={video.thumbnail || 'https://via.placeholder.com/64x48?text=No+Image'}
                          alt={video.title}
                          loading="lazy"
                          className="w-16 h-12 object-cover rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <div className={`text-xs font-bold line-clamp-2 ${isDarkMode ? 'text-white' : 'text-black'}`}>
                            {video.title}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {video.type && (
                              <span className={`inline-block text-[9px] px-1.5 py-0.5 rounded-full text-white ${video.type === 'tv' ? 'bg-blue-500' : 'bg-purple-500'}`}>
                                {video.type === 'tv' ? '📺 TV' : '🎬 Movie'}
                              </span>
                            )}
                            {video.type !== 'tv' && video.type !== 'livetv' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addToQueue(video);
                                }}
                                className={`text-[9px] font-bold px-1 py-0.5 border rounded flex items-center gap-0.5 transition-colors ${isDarkMode
                                  ? 'border-pink-500/40 text-pink-400 hover:bg-pink-500/10'
                                  : 'border-pink-300 text-pink-600 hover:bg-pink-50'
                                  }`}
                              >
                                + Queue
                              </button>
                            )}
                          </div>
                        </div>
                        <ChevronRight className={`shrink-0 self-center ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} size={14} />
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Synced Watchlist Queue */}
              <Suspense fallback={null}>
                <WatchlistQueue
                  roomId={params.roomId}
                  socket={socket}
                  queue={queue}
                  isHost={isHost}
                  username={user.name}
                />
              </Suspense>

              {/* Chat Component */}
              <div
                className="flex-1 pixel-box p-2 flex flex-col transition-colors"
                style={{ backgroundColor: isDarkMode ? 'black' : 'white', minHeight: 0, display: 'flex', flexDirection: 'column' }}
                data-tour="chat"
              >
                <h3 className={`font-bold border-b-2 mb-2 px-2 flex items-center gap-2 shrink-0 ${isDarkMode ? 'text-white border-white' : 'text-black border-black'}`}><MessageCircle size={20} /> Chat</h3>
                <div style={{ flex: '1 1 0%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                  <Chat roomId={params.roomId} socket={socket} username={user.name} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Keyboard Shortcuts Modal */}
        {showShortcuts && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowShortcuts(false)}
          >
            <div
              className={`border-4 p-6 max-w-md w-full ${isDarkMode ? 'border-white shadow-[8px_8px_0px_0px_rgba(255,255,255,0.3)]' : 'border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]'}`}
              style={{ backgroundColor: isDarkMode ? '#1a1a2e' : 'white' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>⌨️ Keyboard Shortcuts</h2>
                <button
                  onClick={() => setShowShortcuts(false)}
                  className={`text-2xl font-bold hover:text-red-500 ${isDarkMode ? 'text-white' : 'text-black'}`}
                >
                  ×
                </button>
              </div>
              <div className="space-y-3">
                <div className={`flex justify-between items-center p-2 border-2 ${isDarkMode ? 'bg-gray-800 border-white' : 'bg-gray-100 border-black'}`}>
                  <span className={isDarkMode ? 'text-white' : 'text-black'}>Toggle Play/Pause</span>
                  <kbd className="px-2 py-1 bg-black text-white text-sm font-mono border border-gray-600">Space</kbd>
                </div>
                <div className={`flex justify-between items-center p-2 border-2 ${isDarkMode ? 'bg-gray-800 border-white' : 'bg-gray-100 border-black'}`}>
                  <span className={isDarkMode ? 'text-white' : 'text-black'}>Toggle Fullscreen</span>
                  <kbd className="px-2 py-1 bg-black text-white text-sm font-mono border border-gray-600">F</kbd>
                </div>
                <div className={`flex justify-between items-center p-2 border-2 ${isDarkMode ? 'bg-gray-800 border-white' : 'bg-gray-100 border-black'}`}>
                  <span className={isDarkMode ? 'text-white' : 'text-black'}>Toggle Mute</span>
                  <kbd className="px-2 py-1 bg-black text-white text-sm font-mono border border-gray-600">M</kbd>
                </div>
                <div className={`flex justify-between items-center p-2 border-2 ${isDarkMode ? 'bg-gray-800 border-white' : 'bg-gray-100 border-black'}`}>
                  <span className={isDarkMode ? 'text-white' : 'text-black'}>Picture in Picture</span>
                  <kbd className="px-2 py-1 bg-black text-white text-sm font-mono border border-gray-600">P</kbd>
                </div>
                <div className={`flex justify-between items-center p-2 border-2 ${isDarkMode ? 'bg-gray-800 border-white' : 'bg-gray-100 border-black'}`}>
                  <span className={isDarkMode ? 'text-white' : 'text-black'}>Seek Forward 10s</span>
                  <kbd className="px-2 py-1 bg-black text-white text-sm font-mono border border-gray-600">→</kbd>
                </div>
                <div className={`flex justify-between items-center p-2 border-2 ${isDarkMode ? 'bg-gray-800 border-white' : 'bg-gray-100 border-black'}`}>
                  <span className={isDarkMode ? 'text-white' : 'text-black'}>Seek Back 10s</span>
                  <kbd className="px-2 py-1 bg-black text-white text-sm font-mono border border-gray-600">←</kbd>
                </div>
                <div className={`flex justify-between items-center p-2 border-2 ${isDarkMode ? 'bg-gray-800 border-white' : 'bg-gray-100 border-black'}`}>
                  <span className={isDarkMode ? 'text-white' : 'text-black'}>Show Shortcuts</span>
                  <kbd className="px-2 py-1 bg-black text-white text-sm font-mono border border-gray-600">?</kbd>
                </div>
              </div>
              <p className={`text-xs mt-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Press <kbd className="px-1 bg-gray-200 text-black rounded">Esc</kbd> or click outside to close
              </p>
            </div>
          </div>
        )}

        {/* TV Show Episode Picker Modal */}
        {selectedTvShow && (
          <EpisodePicker
            show={selectedTvShow}
            onSelect={playEpisode}
            onClose={() => setSelectedTvShow(null)}
            isDarkMode={isDarkMode}
          />
        )}
      </main>
    </>
  );
}
