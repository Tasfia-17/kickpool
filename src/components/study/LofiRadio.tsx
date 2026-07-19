'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Play, Pause, Volume2, VolumeX, SkipForward, SkipBack, Radio, Disc, Music2, Headphones } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Extended collection of lofi streams - Updated with working live streams
const LOFI_STATIONS = [
  { id: 'jfKfPfyJRdk', name: 'Lofi Girl', title: 'lofi hip hop radio - beats to relax/study to', genre: 'Lofi', color: '#ff69b4' },
  { id: '5yx6BWlEVcY', name: 'ChillSynth', title: 'Chillsynth FM - 24/7 Synthwave', genre: 'Synth', color: '#0ea5e9' },
  { id: '36YnV9STBqc', name: 'Jazz Cafe', title: 'Coffee Shop Ambiance - Relaxing Jazz', genre: 'Jazz', color: '#f59e0b' },
  { id: 'Na0w3Mz46GA', name: 'Anime Vibes', title: 'Anime Lofi & Chill Beats', genre: 'Anime', color: '#ec4899' },
  { id: '7NOSDKb0HlU', name: 'Chill Beats', title: 'Chill Out Music Mix', genre: 'Chill', color: '#8b5cf6' },
  { id: '4xDzrJKXOOY', name: 'Rainy Day', title: 'Rain Sounds for Sleep', genre: 'Ambient', color: '#10b981' },
];

interface VisualizerBarProps {
  index: number;
  isPlaying: boolean;
  color: string;
}

const VisualizerBar = ({ index, isPlaying, color }: VisualizerBarProps) => {
  const height = useMemo(() => 20 + Math.random() * 60, []);
  const duration = useMemo(() => 0.2 + Math.random() * 0.3, []);

  return (
    <motion.div
      className="w-2 rounded-t"
      style={{
        backgroundColor: color,
        boxShadow: `0 0 8px ${color}`,
      }}
      animate={isPlaying ? {
        height: [height * 0.3, height, height * 0.5, height * 0.8, height * 0.4],
      } : { height: 4 }}
      transition={{
        duration,
        repeat: Infinity,
        ease: 'easeInOut',
        delay: index * 0.05,
      }}
    />
  );
};

export function LofiRadio() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(50);
  const [isMuted, setIsMuted] = useState(false);
  const [currentStation, setCurrentStation] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const station = LOFI_STATIONS[currentStation];

  // Load saved preferences
  useEffect(() => {
    try {
      const savedVolume = localStorage.getItem('lofi-volume');
      const savedStation = localStorage.getItem('lofi-station');
      if (savedVolume) setVolume(parseInt(savedVolume));
      if (savedStation) {
        const stationIndex = parseInt(savedStation);
        if (stationIndex >= 0 && stationIndex < LOFI_STATIONS.length) {
          setCurrentStation(stationIndex);
        }
      }
    } catch (e) {
      console.error('Failed to load radio preferences:', e);
    }
  }, []);

  // Save preferences
  useEffect(() => {
    try {
      localStorage.setItem('lofi-volume', volume.toString());
      localStorage.setItem('lofi-station', currentStation.toString());
    } catch (e) {
      console.error('Failed to save radio preferences:', e);
    }
  }, [volume, currentStation]);

  const postMessage = useCallback((func: string, args: any = '') => {
    if (iframeRef.current?.contentWindow) {
      const message = JSON.stringify({ event: 'command', func, args });
      iframeRef.current.contentWindow.postMessage(message, '*');
    }
  }, []);

  const togglePlay = useCallback(() => {
    postMessage(isPlaying ? 'pauseVideo' : 'playVideo');
    setIsPlaying(!isPlaying);
  }, [isPlaying, postMessage]);

  const changeStation = useCallback((direction: 'next' | 'prev') => {
    setIsLoading(true);
    setCurrentStation(prev => {
      const newIndex = direction === 'next'
        ? (prev + 1) % LOFI_STATIONS.length
        : (prev - 1 + LOFI_STATIONS.length) % LOFI_STATIONS.length;
      return newIndex;
    });
    setTimeout(() => {
      setIsLoading(false);
      if (isPlaying) {
        postMessage('playVideo');
      }
    }, 1000);
  }, [isPlaying, postMessage]);

  const toggleMute = useCallback(() => {
    postMessage('setVolume', [isMuted ? volume : 0]);
    setIsMuted(!isMuted);
  }, [isMuted, volume, postMessage]);

  const handleVolumeChange = useCallback((newVolume: number) => {
    setVolume(newVolume);
    if (!isMuted) {
      postMessage('setVolume', [newVolume]);
    }
  }, [isMuted, postMessage]);

  const selectStation = useCallback((index: number) => {
    if (index === currentStation) return;
    setIsLoading(true);
    setCurrentStation(index);
    setTimeout(() => {
      setIsLoading(false);
      if (isPlaying) {
        postMessage('playVideo');
      }
    }, 1000);
  }, [currentStation, isPlaying, postMessage]);

  return (
    <div
      className="space-y-3"
      style={{ fontFamily: 'VT323, monospace' }}
    >
      {/* Player Visual */}
      <div
        className="relative border-4 border-black p-4 transition-all duration-500"
        style={{
          background: `linear-gradient(135deg, ${station.color}20, ${station.color}05)`,
          boxShadow: `inset 0 0 30px ${station.color}20`,
        }}
      >
        {/* Station Icon */}
        <motion.div
          className="flex items-center justify-center mb-3"
          animate={{ rotate: isPlaying ? 360 : 0 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        >
          <div
            className="p-4 rounded-full"
            style={{
              background: `linear-gradient(135deg, ${station.color}, ${station.color}80)`,
              boxShadow: isPlaying ? `0 0 20px ${station.color}` : 'none',
            }}
          >
            <Disc size={32} className="text-white" />
          </div>
        </motion.div>

        {/* Visualizer */}
        <div className="flex items-end justify-center gap-1 h-12 mb-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <VisualizerBar
              key={i}
              index={i}
              isPlaying={isPlaying && !isLoading}
              color={station.color}
            />
          ))}
        </div>

        {/* Now Playing */}
        <div className="text-center">
          <motion.div
            key={station.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-2"
          >
            <span
              className="px-2 py-0.5 text-xs font-bold text-white rounded"
              style={{ backgroundColor: station.color }}
            >
              {station.genre}
            </span>
            <span className="text-sm font-bold text-black dark:text-white">{station.name}</span>
          </motion.div>
          <div className="h-5 overflow-hidden mt-1">
            <motion.p
              key={station.title}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-gray-600 dark:text-gray-400 truncate"
            >
              {station.title}
            </motion.p>
          </div>
        </div>

        {/* Loading Overlay */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 flex items-center justify-center"
            >
              <div className="text-white text-sm font-bold animate-pulse">Loading...</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hidden YouTube IFrame */}
        <iframe
          ref={iframeRef}
          width="1"
          height="1"
          src={`https://www.youtube.com/embed/${station.id}?autoplay=0&controls=0&modestbranding=1&rel=0&enablejsapi=1&loop=1&playlist=${station.id}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: '1px', height: '1px' }}
          title={`${station.name} Radio`}
        />
      </div>

      {/* Station Selector */}
      <div className="grid grid-cols-3 gap-1">
        {LOFI_STATIONS.map((s, i) => (
          <motion.button
            key={s.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => selectStation(i)}
            className={`p-1.5 text-xs font-bold border-2 border-black transition-all ${
              i === currentStation
                ? 'text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                : 'bg-white dark:bg-gray-800 text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            style={{
              backgroundColor: i === currentStation ? s.color : undefined,
            }}
          >
            {s.genre}
          </motion.button>
        ))}
      </div>

      {/* Playback Controls */}
      <div className="flex items-center justify-center gap-2">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => changeStation('prev')}
          className="p-2 border-2 border-black bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
          aria-label="Previous station"
        >
          <SkipBack size={16} className="text-black dark:text-white" />
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={togglePlay}
          className="p-3 border-2 border-black text-white transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[3px] active:translate-y-[3px]"
          style={{ backgroundColor: station.color }}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => changeStation('next')}
          className="p-2 border-2 border-black bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
          aria-label="Next station"
        >
          <SkipForward size={16} className="text-black dark:text-white" />
        </motion.button>
      </div>

      {/* Volume Control */}
      <div className="flex items-center gap-2 px-1">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={toggleMute}
          className="p-1.5 border-2 border-black bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
          aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </motion.button>

        <div className="flex-1 relative h-3 bg-gray-200 dark:bg-gray-700 border-2 border-black">
          <motion.div
            className="absolute inset-y-0 left-0"
            style={{
              width: `${isMuted ? 0 : volume}%`,
              backgroundColor: station.color,
            }}
            animate={{ width: `${isMuted ? 0 : volume}%` }}
          />
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
            className="absolute inset-0 w-full opacity-0 cursor-pointer"
            aria-label="Volume"
          />
        </div>

        <span className="text-xs font-bold w-8 text-right text-black dark:text-white">
          {isMuted ? '0' : volume}%
        </span>
      </div>
    </div>
  );
}

