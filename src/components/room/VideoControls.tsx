'use client';

import React, { memo } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, SkipForward, Settings, List, PictureInPicture2 } from 'lucide-react';

interface VideoControlsProps {
  progress: number;
  duration: number;
  playing: boolean;
  volume: number;
  muted: boolean;
  playbackRate: number;
  showControls: boolean;
  showSettings: boolean;
  showQueue: boolean;
  queueLength: number;
  isFullscreen: boolean;
  isPiP: boolean;
  isMovieEmbed: boolean;
  videoTitle: string;
  videoProvider: string;
  onPlayPause: () => void;
  onSeekChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSeekMouseUp: (e: React.MouseEvent<HTMLInputElement>) => void;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
  onPlaybackRateChange: (rate: number) => void;
  onToggleFullscreen: () => void;
  onTogglePiP: () => void;
  onToggleSettings: () => void;
  onToggleQueue: () => void;
  onSkipNext?: () => void;
  isHost: boolean;
}

// Memoized control bar component - only re-renders when props change
export const VideoControls = memo<VideoControlsProps>(({
  progress,
  duration,
  playing,
  volume,
  muted,
  playbackRate,
  showControls,
  showSettings,
  queueLength,
  isFullscreen,
  isPiP,
  videoTitle,
  videoProvider,
  onPlayPause,
  onSeekChange,
  onSeekMouseUp,
  onVolumeChange,
  onMuteToggle,
  onPlaybackRateChange,
  onToggleFullscreen,
  onTogglePiP,
  onToggleSettings,
  onToggleQueue,
  onSkipNext,
  isHost,
}) => {
  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return '0:00';
    const date = new Date(time * 1000);
    const hh = date.getUTCHours();
    const mm = date.getUTCMinutes();
    const ss = date.getUTCSeconds().toString().padStart(2, '0');
    if (hh) {
      return `${hh}:${mm.toString().padStart(2, '0')}:${ss}`;
    }
    return `${mm}:${ss}`;
  };

  return (
    <>
      {/* Video Title Overlay */}
      <div className={`absolute top-0 left-0 right-0 p-2 sm:p-4 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        <h3 className="text-white font-bold text-sm sm:text-lg truncate">{videoTitle}</h3>
        <p className="text-gray-300 text-xs sm:text-sm">{videoProvider.toUpperCase()}</p>
      </div>

      {/* Controls Overlay */}
      <div className={`absolute bottom-0 left-0 right-0 p-2 sm:p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        {/* Progress Bar - Larger touch target on mobile */}
        {videoProvider !== 'iptv' && (
          <div className="relative mb-2 sm:mb-4 group/progress py-2 -my-2">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={progress}
              onChange={onSeekChange}
              onMouseUp={onSeekMouseUp}
              onTouchEnd={(e) => onSeekMouseUp(e as any)}
              className="w-full h-2 sm:h-1 sm:group-hover/progress:h-2 transition-all bg-white/30 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 sm:[&::-webkit-slider-thumb]:w-4 sm:[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer"
              style={{
                background: `linear-gradient(to right, #ff69b4 0%, #ff69b4 ${(progress / (duration || 1)) * 100}%, rgba(255,255,255,0.3) ${(progress / (duration || 1)) * 100}%, rgba(255,255,255,0.3) 100%)`
              }}
            />
          </div>
        )}

        <div className="flex items-center justify-between text-white">
          {/* Left Controls */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={onPlayPause}
              className="p-2 sm:p-2 active:bg-white/30 sm:hover:bg-white/20 rounded-lg transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
              title={playing ? 'Pause (K)' : 'Play (K)'}
            >
              {playing ? <Pause size={22} /> : <Play size={22} />}
            </button>

            {queueLength > 0 && isHost && onSkipNext && (
              <button
                onClick={onSkipNext}
                className="hidden sm:flex p-2 hover:bg-white/20 rounded-lg transition-colors items-center justify-center"
                title="Skip to next"
              >
                <SkipForward size={20} />
              </button>
            )}

            <div className="flex items-center gap-1 group/vol">
              <button
                onClick={onMuteToggle}
                className="p-2 active:bg-white/30 sm:hover:bg-white/20 rounded-lg transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
                title={muted ? 'Unmute (M)' : 'Mute (M)'}
              >
                {muted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                onChange={(e) => {
                  onVolumeChange(parseFloat(e.target.value));
                }}
                className="hidden sm:block w-0 group-hover/vol:w-20 transition-all h-1 bg-white/30 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
              />
            </div>

            <span className="text-[10px] sm:text-sm font-mono ml-1 sm:ml-2 flex items-center gap-1.5">
              {videoProvider === 'iptv' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-red-500 font-bold">LIVE</span>
                </>
              ) : (
                `${formatTime(progress)} / ${formatTime(duration)}`
              )}
            </span>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-0.5 sm:gap-1">
            {/* Queue Button - Hidden on mobile if empty */}
            {queueLength > 0 && (
              <button
                onClick={onToggleQueue}
                className="hidden sm:flex p-2 hover:bg-white/20 rounded-lg transition-colors relative items-center justify-center"
                title="Queue"
              >
                <List size={20} />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-pink-500 rounded-full text-xs flex items-center justify-center">
                  {queueLength}
                </span>
              </button>
            )}

            {/* Settings - Smaller on mobile */}
            <div className="relative">
              <button
                onClick={onToggleSettings}
                className="p-2 active:bg-white/30 sm:hover:bg-white/20 rounded-lg transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
                title="Settings"
              >
                <Settings size={18} className="sm:w-5 sm:h-5" />
              </button>
              {showSettings && (
                <div className="absolute bottom-full right-0 mb-2 bg-black/90 border border-white/20 rounded-lg p-2 sm:p-3 min-w-[160px] sm:min-w-[200px]">
                  <div className="text-xs sm:text-sm font-bold mb-2">Playback Speed</div>
                  <div className="flex flex-wrap gap-1">
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map(speed => (
                      <button
                        key={speed}
                        onClick={() => onPlaybackRateChange(speed)}
                        className={`px-2 py-1.5 sm:py-1 text-xs rounded min-w-[40px] ${playbackRate === speed ? 'bg-pink-500' : 'bg-white/20 active:bg-white/40 sm:hover:bg-white/30'}`}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* PiP Button - Hidden on mobile (not well supported) */}
            <button
              onClick={onTogglePiP}
              className={`hidden sm:flex p-2 hover:bg-white/20 rounded-lg transition-colors items-center justify-center ${isPiP ? 'bg-pink-500/50' : ''}`}
              title="Picture-in-Picture (P)"
            >
              <PictureInPicture2 size={20} />
            </button>

            {/* Fullscreen */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleFullscreen();
              }}
              className="p-2 active:bg-white/30 sm:hover:bg-white/20 rounded-lg transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
              title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
            >
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
          </div>
        </div>
      </div>

    </>
  );
});

VideoControls.displayName = 'VideoControls';

