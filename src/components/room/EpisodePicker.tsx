'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Tv, X, Play } from 'lucide-react';

// TV Episode Picker Modal - Simple version for OMDb/IMDb
export interface EpisodePickerProps {
  show: any;
  onSelect: (season: number, episode: number, sourceUrl: string) => void;
  onClose: () => void;
  isDarkMode: boolean;
}

export interface SeasonInfo {
  seasonNumber: number;
  name: string;
  episodeCount: number;
  airDate: string | null;
}

export interface EpisodeInfo {
  episodeNumber: number;
  name: string;
  overview: string;
  airDate: string | null;
  stillPath: string | null;
  runtime: number | null;
}

export const EpisodePicker: React.FC<EpisodePickerProps> = ({ show, onSelect, onClose, isDarkMode }) => {
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [selectedEpisode, setSelectedEpisode] = useState<number>(1);
  const [seasons, setSeasons] = useState<SeasonInfo[]>([]);
  const [episodes, setEpisodes] = useState<EpisodeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [tmdbId, setTmdbId] = useState<number | null>(null);
  const [selectedSource, setSelectedSource] = useState<string>('vidsrc');

  // Extract IMDb ID properly (handle both "tt123456" and "vidsrc-tt123456" formats)
  const getImdbId = (): string | null => {
    // Direct imdbId field
    if (show.imdbId && show.imdbId.startsWith('tt')) {
      return show.imdbId;
    }
    // Check if id itself is an IMDb ID
    if (show.id && show.id.startsWith('tt')) {
      return show.id;
    }
    // Extract from composite id like "vidsrc-tt123456"
    if (show.id && show.id.includes('-tt')) {
      const match = show.id.match(/tt\d+/);
      return match ? match[0] : null;
    }
    return null;
  };

  // Fetch TV show details (seasons) on mount
  useEffect(() => {
    const fetchShowDetails = async () => {
      setLoading(true);
      try {
        const imdbId = getImdbId();

        // First, convert IMDb ID to TMDB ID if we have one
        let showTmdbId = tmdbId;
        if (!showTmdbId && imdbId) {
          try {
            const findRes = await fetch(`/api/tmdb/find/${imdbId}`);
            if (findRes.ok) {
              const findData = await findRes.json();
              showTmdbId = findData.tmdbId;
              setTmdbId(showTmdbId);
            } else {
              const errData = await findRes.json().catch(() => ({}));
              console.error('EpisodePicker: TMDB find error:', errData);
            }
          } catch (e) {
            console.error('TMDB find error:', e);
          }
        }

        if (showTmdbId) {
          // Fetch TV show details from TMDB
          try {
            const tvRes = await fetch(`/api/tv/${showTmdbId}`);
            if (tvRes.ok) {
              const tvData = await tvRes.json();
              if (tvData.seasons && tvData.seasons.length > 0) {
                setSeasons(tvData.seasons);
                // Load episodes for the first season
                fetchEpisodes(showTmdbId, 1);
                return; // Success!
              }
            }
          } catch (e) {
            console.error('TMDB TV fetch error:', e);
          }
        }

        // Fallback to hardcoded seasons if TMDB fails
        const fallbackSeasons = show.numberOfSeasons || 10;
        setSeasons(Array.from({ length: fallbackSeasons }, (_, i) => ({
          seasonNumber: i + 1,
          name: `Season ${i + 1}`,
          episodeCount: 25,
          airDate: null,
        })));
        setEpisodes(Array.from({ length: 25 }, (_, i) => ({
          episodeNumber: i + 1,
          name: `Episode ${i + 1}`,
          overview: '',
          airDate: null,
          stillPath: null,
          runtime: null,
        })));
      } catch (error) {
        console.error('Failed to fetch show details:', error);
        // Fallback
        const fallbackSeasons = show.numberOfSeasons || 10;
        setSeasons(Array.from({ length: fallbackSeasons }, (_, i) => ({
          seasonNumber: i + 1,
          name: `Season ${i + 1}`,
          episodeCount: 25,
          airDate: null,
        })));
        setEpisodes(Array.from({ length: 25 }, (_, i) => ({
          episodeNumber: i + 1,
          name: `Episode ${i + 1}`,
          overview: '',
          airDate: null,
          stillPath: null,
          runtime: null,
        })));
      } finally {
        setLoading(false);
      }
    };

    fetchShowDetails();
  }, [show]);

  // Fetch episodes when season changes
  const fetchEpisodes = async (showId: number, seasonNum: number) => {
    setLoadingEpisodes(true);
    try {
      const res = await fetch(`/api/tv/${showId}?season=${seasonNum}`);
      if (res.ok) {
        const data = await res.json();
        if (data.episodes && data.episodes.length > 0) {
          setEpisodes(data.episodes);
          setSelectedEpisode(1);
        }
      }
    } catch (error) {
      console.error('Failed to fetch episodes:', error);
    } finally {
      setLoadingEpisodes(false);
    }
  };

  // Handle season change
  const handleSeasonChange = (seasonNum: number) => {
    setSelectedSeason(seasonNum);
    setSelectedEpisode(1);
    if (tmdbId) {
      fetchEpisodes(tmdbId, seasonNum);
    } else {
      // Fallback - use current season's episode count if available
      const season = seasons.find(s => s.seasonNumber === seasonNum);
      const epCount = season?.episodeCount || 20;
      setEpisodes(Array.from({ length: epCount }, (_, i) => ({
        episodeNumber: i + 1,
        name: `Episode ${i + 1}`,
        overview: '',
        airDate: null,
        stillPath: null,
        runtime: null,
      })));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-[60] sm:p-4" onClick={onClose}>
      <div
        className={`w-full sm:max-w-md rounded-t-2xl sm:rounded-xl border-t-4 sm:border-4 overflow-hidden max-h-[90vh] sm:max-h-[80vh] flex flex-col ${isDarkMode ? 'bg-gray-900 border-white/30' : 'bg-white border-black'}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile drag indicator */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className={`w-12 h-1.5 rounded-full ${isDarkMode ? 'bg-white/30' : 'bg-gray-300'}`} />
        </div>

        {/* Header */}
        <div className={`p-3 sm:p-4 border-b-2 flex items-center justify-between ${isDarkMode ? 'border-white/20 bg-purple-900/50' : 'border-black bg-purple-100'}`}>
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <Tv className="text-purple-500 shrink-0" size={20} />
            <div className="min-w-0 flex-1">
              <h2 className={`font-bold text-base sm:text-lg truncate ${isDarkMode ? 'text-white' : 'text-black'}`}>{show.originalTitle || show.title}</h2>
              <p className={`text-xs sm:text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Select Season & Episode</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center hover:bg-white/10 rounded-lg shrink-0">
            <X size={22} className={isDarkMode ? 'text-white' : 'text-black'} />
          </button>
        </div>

        {/* Thumbnail - Hidden on mobile for more space */}
        {show.thumbnail && (
          <div className="hidden sm:flex justify-center p-4 bg-black/20">
            <div className="relative h-48 w-32">
              <Image src={show.thumbnail} alt={show.title} fill sizes="128px" className="object-contain rounded-lg shadow-lg" />
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-3"></div>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading episodes...</p>
            </div>
          </div>
        ) : (
          /* Season & Episode Selectors */
          <div className="p-3 sm:p-4 space-y-4 overflow-y-auto flex-1">
            {/* Season Selector */}
            <div>
              <label className={`block text-sm font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-black'}`}>
                📺 Season ({seasons.length} total)
              </label>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {seasons.map(s => (
                  <button
                    key={s.seasonNumber}
                    onClick={() => handleSeasonChange(s.seasonNumber)}
                    className={`w-11 h-11 sm:w-10 sm:h-10 rounded-lg font-bold text-sm transition-all ${selectedSeason === s.seasonNumber
                      ? 'bg-purple-500 text-white scale-105 sm:scale-110'
                      : isDarkMode
                        ? 'bg-gray-800 text-gray-300 active:bg-gray-700'
                        : 'bg-gray-100 text-gray-600 active:bg-gray-200 border border-gray-300'
                      }`}
                    title={s.name}
                  >
                    {s.seasonNumber}
                  </button>
                ))}
              </div>
              {/* Season info */}
              {seasons.find(s => s.seasonNumber === selectedSeason) && (
                <p className={`text-xs mt-1.5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  {seasons.find(s => s.seasonNumber === selectedSeason)?.name} • {seasons.find(s => s.seasonNumber === selectedSeason)?.episodeCount} episodes
                </p>
              )}
            </div>

            {/* Episode Selector */}
            <div>
              <label className={`block text-sm font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-black'}`}>
                🎬 Episode ({episodes.length} total)
                {loadingEpisodes && <span className="ml-2 text-xs text-purple-400 animate-pulse">Loading...</span>}
              </label>
              <div className="flex flex-wrap gap-1.5 sm:gap-2 max-h-40 sm:max-h-32 overflow-y-auto">
                {episodes.map(ep => (
                  <button
                    key={ep.episodeNumber}
                    onClick={() => setSelectedEpisode(ep.episodeNumber)}
                    className={`w-11 h-11 sm:w-10 sm:h-10 rounded-lg font-bold text-sm transition-all ${selectedEpisode === ep.episodeNumber
                      ? 'bg-pink-500 text-white scale-105 sm:scale-110'
                      : isDarkMode
                        ? 'bg-gray-800 text-gray-300 active:bg-gray-700'
                        : 'bg-gray-100 text-gray-600 active:bg-gray-200 border border-gray-300'
                      }`}
                    title={ep.name || `Episode ${ep.episodeNumber}`}
                  >
                    {ep.episodeNumber}
                  </button>
                ))}
              </div>
              {/* Episode info */}
              {episodes.find(ep => ep.episodeNumber === selectedEpisode) && episodes.find(ep => ep.episodeNumber === selectedEpisode)?.name && (
                <div className={`mt-2 p-2 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  <p className={`text-sm font-bold truncate ${isDarkMode ? 'text-white' : 'text-black'}`}>
                    {episodes.find(ep => ep.episodeNumber === selectedEpisode)?.name}
                  </p>
                  {episodes.find(ep => ep.episodeNumber === selectedEpisode)?.runtime && (
                    <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {episodes.find(ep => ep.episodeNumber === selectedEpisode)?.runtime} min
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Source Selector */}
            {episodes.length > 0 && (
              <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                <label className={`block text-xs font-bold mb-2 uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Server
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSelectedSource('vidsrc')}
                    className={`py-2 px-2 rounded-lg text-xs font-bold transition-all border-2 ${selectedSource === 'vidsrc' ? 'bg-purple-500 text-white border-purple-600 shadow-md' : isDarkMode ? 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'}`}
                  >
                    Server 1 (VidSrc)
                  </button>
                  <button
                    onClick={() => setSelectedSource('vidbinge')}
                    className={`py-2 px-2 rounded-lg text-xs font-bold transition-all border-2 ${selectedSource === 'vidbinge' ? 'bg-pink-500 text-white border-pink-600 shadow-md' : isDarkMode ? 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'}`}
                  >
                    Server 2 (VidBinge)
                  </button>
                  <button
                    onClick={() => setSelectedSource('vidsrcxyz')}
                    className={`py-2 px-2 rounded-lg text-xs font-bold transition-all border-2 ${selectedSource === 'vidsrcxyz' ? 'bg-blue-500 text-white border-blue-600 shadow-md' : isDarkMode ? 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'}`}
                  >
                    Server 3 (VidSrc XYZ)
                  </button>
                  <button
                    onClick={() => setSelectedSource('2embed')}
                    className={`py-2 px-2 rounded-lg text-xs font-bold transition-all border-2 ${selectedSource === '2embed' ? 'bg-emerald-500 text-white border-emerald-600 shadow-md' : isDarkMode ? 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'}`}
                  >
                    Server 4 (2Embed)
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Play Button - Fixed at bottom on mobile */}
        <div className="p-3 sm:p-4 border-t-2 border-t-gray-200 dark:border-t-gray-700 bg-inherit safe-area-bottom">
          <button
            onClick={() => onSelect(selectedSeason, selectedEpisode, selectedSource)}
            className="w-full py-3.5 sm:py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-lg active:opacity-80 sm:hover:opacity-90 transition-all flex items-center justify-center gap-2 text-base sm:text-lg shadow-lg min-h-[48px]"
          >
            <Play size={22} />
            Play S{selectedSeason}E{selectedEpisode}
          </button>
        </div>
      </div>
    </div>
  );
};
