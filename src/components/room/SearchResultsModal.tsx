'use client';

import React, { useState } from 'react';
import { X, ChevronRight, ListPlus, Bookmark, BookmarkCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { useSession } from 'next-auth/react';

export interface SearchResultsModalProps {
  results: any[];
  searchType: 'youtube' | 'movies' | 'anime' | 'livetv';
  onSelect: (video: any) => void;
  onAddToQueue?: (video: any) => void;
  onClose: () => void;
  isDarkMode: boolean;
  isSearching: boolean;
  query: string;
}

export const SearchResultsModal: React.FC<SearchResultsModalProps> = ({
  results,
  searchType,
  onSelect,
  onAddToQueue,
  onClose,
  isDarkMode,
  isSearching,
  query
}) => {
  const { data: session } = useSession();
  const [selectedVideoForSources, setSelectedVideoForSources] = useState<any | null>(null);
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set());

  const toggleBookmark = async (e: React.MouseEvent, video: any) => {
    e.stopPropagation();
    if (!session?.user) return;
    const key = `${video.id}-${video.type === 'tv' ? 'tv' : 'movie'}`;
    if (bookmarked.has(key)) {
      await fetch(`/api/watchlist?tmdbId=${video.id}&tmdbType=${video.type === 'tv' ? 'tv' : 'movie'}`, { method: 'DELETE' });
      setBookmarked(prev => { const n = new Set(prev); n.delete(key); return n; });
    } else {
      await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tmdbId: video.id,
          tmdbType: video.type === 'tv' ? 'tv' : 'movie',
          title: video.title,
          poster: video.thumbnail?.includes('image.tmdb.org') ? video.thumbnail.split('/w500')[1] || null : null,
          year: video.year || null,
        }),
      });
      setBookmarked(prev => new Set(Array.from(prev).concat(key)));
    }
  };

  const handleClose = () => {
    setSelectedVideoForSources(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-40 sm:p-4" onClick={handleClose}>
      <div
        className={`w-full sm:max-w-lg rounded-t-2xl sm:rounded-xl border-t-4 sm:border-4 overflow-hidden max-h-[90vh] sm:max-h-[80vh] flex flex-col ${isDarkMode ? 'bg-gray-900 border-white/30' : 'bg-white border-black'}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile drag indicator */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className={`w-12 h-1.5 rounded-full ${isDarkMode ? 'bg-white/30' : 'bg-gray-300'}`} />
        </div>

        {/* Header */}
        <div
          className={`p-3 sm:p-4 border-b-2 flex items-center justify-between ${isDarkMode ? 'border-white/20' : 'border-black'}`}
          style={{
            backgroundColor:
              searchType === 'movies' ? '#8b5cf6' :
                searchType === 'anime' ? '#ec4899' :
                  searchType === 'livetv' ? '#0ea5e9' :
                    '#ef4444'
          }}
        >
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <span className="text-2xl">
              {searchType === 'movies' ? '🎥' :
                searchType === 'anime' ? '🌸' :
                  searchType === 'livetv' ? '📡' :
                    '🎬'}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-base sm:text-lg truncate text-white">
                {searchType === 'movies' ? 'Movies/TV' :
                  searchType === 'anime' ? 'Anime' :
                    searchType === 'livetv' ? 'Live TV' :
                      'YouTube'}
              </h2>
              <p className="text-xs sm:text-sm text-white/80">
                {isSearching ? 'Searching...' : `${results.length} results for "${query}"`}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center hover:bg-white/10 rounded-lg shrink-0">
            <X size={22} className="text-white" />
          </button>
        </div>

        {/* Loading State */}
        {isSearching ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-3"></div>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Searching...</p>
            </div>
          </div>
        ) : results.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <span className="text-4xl mb-3 block">🔍</span>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>No results found</p>
            </div>
          </div>
        ) : selectedVideoForSources ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center">
            <button
              onClick={() => setSelectedVideoForSources(null)}
              className={`self-start mb-4 text-sm font-bold flex items-center gap-1 ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-black'} transition-colors`}
            >
              ← Back to results
            </button>
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 w-full max-w-md">
              <img
                src={selectedVideoForSources.thumbnail || 'https://via.placeholder.com/300x450?text=No+Image'}
                alt={selectedVideoForSources.title}
                className="w-32 h-48 sm:w-40 sm:h-60 object-cover rounded-lg shadow-lg border-2 border-white/10"
              />
              <div className="flex-1 w-full text-center sm:text-left">
                <h3 className={`text-xl sm:text-2xl font-bold mb-2 line-clamp-2 ${isDarkMode ? 'text-white' : 'text-black'}`}>
                  {selectedVideoForSources.title}
                </h3>
                {selectedVideoForSources.year && (
                  <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{selectedVideoForSources.year}</p>
                )}
                <p className={`text-sm font-bold mb-3 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>Select Video Source</p>

                <div className="space-y-2.5">
                  <button
                    onClick={() => onSelect({ ...selectedVideoForSources })}
                    className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow-[0_4px_0_0_#581c87] active:shadow-none active:translate-y-1 transition-all flex items-center justify-between"
                  >
                    <span>Server 1 (VidSrc)</span>
                    <span className="text-[10px] bg-black/20 px-1.5 py-0.5 rounded">FAST</span>
                  </button>

                  {selectedVideoForSources.url2 && (
                    <button
                      onClick={() => onSelect({ ...selectedVideoForSources, url: selectedVideoForSources.url2 })}
                      className="w-full py-2.5 px-4 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-lg shadow-[0_4px_0_0_#831843] active:shadow-none active:translate-y-1 transition-all flex items-center justify-between"
                    >
                      <span>Server 2 (VidBinge)</span>
                      <span className="text-[10px] bg-black/20 px-1.5 py-0.5 rounded">HD</span>
                    </button>
                  )}

                  {selectedVideoForSources.url3 && (
                    <button
                      onClick={() => onSelect({ ...selectedVideoForSources, url: selectedVideoForSources.url3 })}
                      className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-[0_4px_0_0_#1e3a8a] active:shadow-none active:translate-y-1 transition-all flex items-center justify-between"
                    >
                      <span>Server 3 (VidSrc XYZ)</span>
                      <span className="text-[10px] bg-black/20 px-1.5 py-0.5 rounded">BACKUP</span>
                    </button>
                  )}

                  {selectedVideoForSources.url4 && (
                    <button
                      onClick={() => onSelect({ ...selectedVideoForSources, url: selectedVideoForSources.url4 })}
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-[0_4px_0_0_#064e3b] active:shadow-none active:translate-y-1 transition-all flex items-center justify-between"
                    >
                      <span>Server 4 (2Embed)</span>
                      <span className="text-[10px] bg-black/20 px-1.5 py-0.5 rounded">ALT</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Results List */
          <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-2">
            {results.map((video, index) => (
              <motion.div
                key={video.id}
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
                onClick={() => {
                  if (video.provider === 'movie' && video.type !== 'tv') {
                    setSelectedVideoForSources(video);
                  } else {
                    onSelect(video);
                  }
                }}
                className={`flex gap-3 p-3 cursor-pointer border-2 rounded-lg transition-all active:scale-[0.98] ${isDarkMode ? 'bg-gray-800 border-gray-700 active:bg-gray-700' : 'bg-gray-50 border-gray-200 active:bg-pink-50'}`}
              >
                <div className="relative shrink-0">
                  <img
                    src={video.thumbnail || 'https://via.placeholder.com/144x96?text=No+Image'}
                    alt={video.title}
                    loading="lazy"
                    className={`w-24 h-16 sm:w-32 sm:h-20 object-cover rounded-lg border-2 ${isDarkMode ? 'border-white/20' : 'border-gray-300'}`}
                  />
                  {video.duration && (
                    <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1 py-0.5 rounded font-mono">
                      {video.duration}
                    </span>
                  )}
                  {video.type && (
                    <span className={`absolute top-1 left-1 text-white text-[10px] px-1.5 py-0.5 rounded font-bold ${video.type === 'tv' ? 'bg-blue-500' :
                      video.type === 'anime' || video.isAnime ? 'bg-pink-500' :
                        video.type === 'livetv' ? 'bg-sky-500' :
                          'bg-purple-500'
                      }`}>
                      {video.type === 'tv' ? '📺 TV' :
                        video.isAnime ? '🌸 ANIME' :
                          video.type === 'livetv' ? '📡 LIVE' :
                            '🎬'}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className={`text-sm font-bold line-clamp-2 ${isDarkMode ? 'text-white' : 'text-black'}`}>{video.title}</div>
                  {video.channel && <div className={`text-xs ${isDarkMode ? 'text-pink-400' : 'text-pink-600'}`}>{video.channel}</div>}
                  {video.year && <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{video.year}</div>}
                  {video.country && <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{video.country} {video.categories?.join(', ')}</div>}
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs font-medium ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                      {video.type === 'tv' && !video.isAnime ? '▶ Select episodes' :
                        video.type === 'livetv' ? '▶ Stream channel' :
                          '▶ Play now'}
                    </span>
                    {onAddToQueue && video.type !== 'tv' && video.type !== 'livetv' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToQueue(video);
                        }}
                        className={`text-[10px] font-bold px-1.5 py-0.5 border rounded flex items-center gap-0.5 transition-colors ${
                          isDarkMode
                            ? 'border-pink-500/40 text-pink-400 hover:bg-pink-500/10'
                            : 'border-pink-300 text-pink-600 hover:bg-pink-50'
                        }`}
                        title="Add to queue"
                      >
                        <ListPlus size={10} />
                        Queue
                      </button>
                    )}
                    {session?.user && (video.provider === 'movie' || video.type === 'tv') && (
                      <button
                        onClick={(e) => toggleBookmark(e, video)}
                        className={`text-[10px] font-bold px-1.5 py-0.5 border rounded flex items-center gap-0.5 transition-colors ${
                          isDarkMode
                            ? 'border-blue-500/40 text-blue-400 hover:bg-blue-500/10'
                            : 'border-blue-300 text-blue-600 hover:bg-blue-50'
                        }`}
                        title={bookmarked.has(`${video.id}-${video.type === 'tv' ? 'tv' : 'movie'}`) ? 'Remove from watchlist' : 'Add to watchlist'}
                      >
                        {bookmarked.has(`${video.id}-${video.type === 'tv' ? 'tv' : 'movie'}`) ? (
                          <><BookmarkCheck size={10} /> Saved</>
                        ) : (
                          <><Bookmark size={10} /> Save</>
                        )}
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
    </div>
  );
};
