'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Medal, Crown, Volume2, VolumeX, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

// ============================================
// TOUCH/SWIPE CONTROLS HOOK
// ============================================
interface SwipeHandlers {
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  minSwipeDistance?: number;
}

export function useSwipeControls({
  onSwipeUp,
  onSwipeDown,
  onSwipeLeft,
  onSwipeRight,
  minSwipeDistance = 30,
}: SwipeHandlers) {
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    touchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  }, []);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!touchStart.current) return;

    const touchEnd = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY,
    };

    const deltaX = touchEnd.x - touchStart.current.x;
    const deltaY = touchEnd.y - touchStart.current.y;

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (Math.max(absX, absY) < minSwipeDistance) return;

    if (absX > absY) {
      // Horizontal swipe
      if (deltaX > 0) {
        onSwipeRight?.();
      } else {
        onSwipeLeft?.();
      }
    } else {
      // Vertical swipe
      if (deltaY > 0) {
        onSwipeDown?.();
      } else {
        onSwipeUp?.();
      }
    }

    touchStart.current = null;
  }, [onSwipeUp, onSwipeDown, onSwipeLeft, onSwipeRight, minSwipeDistance]);

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchEnd]);
}

// ============================================
// MOBILE D-PAD CONTROLS
// ============================================
interface DPadProps {
  onUp: () => void;
  onDown: () => void;
  onLeft: () => void;
  onRight: () => void;
  disabled?: boolean;
}

export function DPadControls({ onUp, onDown, onLeft, onRight, disabled }: DPadProps) {
  const buttonClass = `
    w-10 h-10 rounded-lg flex items-center justify-center
    bg-gray-700 active:bg-gray-600 text-white
    border-2 border-gray-600 shadow-md
    disabled:opacity-50 disabled:cursor-not-allowed
    touch-manipulation select-none
  `;

  return (
    <div className="grid grid-cols-3 grid-rows-3 gap-1 w-fit mx-auto mt-2">
      <div /> {/* Empty cell */}
      <button
        className={buttonClass}
        onTouchStart={(e) => { e.preventDefault(); onUp(); }}
        onClick={onUp}
        disabled={disabled}
        aria-label="Up"
      >
        <ChevronUp size={20} />
      </button>
      <div /> {/* Empty cell */}
      
      <button
        className={buttonClass}
        onTouchStart={(e) => { e.preventDefault(); onLeft(); }}
        onClick={onLeft}
        disabled={disabled}
        aria-label="Left"
      >
        <ChevronLeft size={20} />
      </button>
      <div className="w-10 h-10 rounded-full bg-gray-800 border-2 border-gray-600" /> {/* Center */}
      <button
        className={buttonClass}
        onTouchStart={(e) => { e.preventDefault(); onRight(); }}
        onClick={onRight}
        disabled={disabled}
        aria-label="Right"
      >
        <ChevronRight size={20} />
      </button>
      
      <div /> {/* Empty cell */}
      <button
        className={buttonClass}
        onTouchStart={(e) => { e.preventDefault(); onDown(); }}
        onClick={onDown}
        disabled={disabled}
        aria-label="Down"
      >
        <ChevronDown size={20} />
      </button>
      <div /> {/* Empty cell */}
    </div>
  );
}

// ============================================
// LEADERBOARD COMPONENT
// ============================================
interface LeaderboardEntry {
  username: string;
  score: number;
  rank: number;
}

interface LeaderboardProps {
  gameType: string;
  isOpen: boolean;
  onClose: () => void;
}

export function Leaderboard({ gameType, isOpen, onClose }: LeaderboardProps) {
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const controller = new AbortController();
      setLoading(true);
      fetch(`/api/minigames/leaderboard?gameType=${gameType}`, { signal: controller.signal })
        .then(res => res.json())
        .then(data => {
          setLeaders(data.leaders || []);
          setLoading(false);
        })
        .catch((error) => {
          if (error.name !== 'AbortError') {
            setLoading(false);
            console.error('Failed to fetch leaderboard:', error);
          }
        });
      return () => controller.abort();
    }
  }, [isOpen, gameType]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown size={16} className="text-yellow-400" />;
      case 2: return <Medal size={16} className="text-gray-300" />;
      case 3: return <Medal size={16} className="text-amber-600" />;
      default: return <span className="text-xs font-bold w-4 text-center">{rank}</span>;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#9ca04c] border-4 border-[#0f380f] rounded-xl p-4 w-full max-w-xs shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-[#0f380f] flex items-center gap-2">
                <Trophy size={18} /> LEADERBOARD
              </h3>
              <button
                onClick={onClose}
                className="text-[#0f380f] hover:opacity-70 font-bold"
              >
                ✕
              </button>
            </div>

            {loading ? (
              <div className="text-center py-8 text-[#0f380f] opacity-70">Loading...</div>
            ) : leaders.length === 0 ? (
              <div className="text-center py-8 text-[#0f380f] opacity-70 text-sm">
                No scores yet. Be the first!
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {leaders.map((entry, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 p-2 rounded-lg ${
                      entry.rank <= 3 ? 'bg-[#0f380f]/20' : 'bg-[#0f380f]/10'
                    }`}
                  >
                    <div className="w-6 flex justify-center">
                      {getRankIcon(entry.rank)}
                    </div>
                    <div className="flex-1 font-mono text-sm text-[#0f380f] truncate">
                      {entry.username}
                    </div>
                    <div className="font-black text-[#0f380f]">
                      {entry.score.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================
// SOUND EFFECTS MANAGER
// ============================================
const sounds: Record<string, HTMLAudioElement> = {};

let sharedAudioContext: AudioContext | null = null;
const audioInitialized = false;

function getOrCreateAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  
  if (!sharedAudioContext) {
    try {
      sharedAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {
      console.warn('AudioContext not supported');
      return null;
    }
  }
  return sharedAudioContext;
}

export function preloadSounds() {
  if (typeof window === 'undefined') return null;
  
  // Don't create AudioContext immediately - let it be created on first user interaction
  const createBeep = (frequency: number, duration: number): string => {
    const audioContext = getOrCreateAudioContext();
    if (!audioContext) return 'beep';
    
    // Resume if suspended
    if (audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {});
    }
    
    try {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'square';
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + duration);
    } catch {
      // Sound playback failed - ignore
    }
    
    return 'beep';
  };
  
  return { createBeep, audioContext: getOrCreateAudioContext() };
}

export function useSoundEffects() {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Initialize audio context only after component mounts (client-side)
    // The actual AudioContext creation will happen on user interaction
    const initAudio = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = getOrCreateAudioContext();
        if (audioContextRef.current) {
          setInitialized(true);
        }
      }
    };
    
    // Listen for user interaction to initialize audio
    const handleInteraction = () => {
      initAudio();
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume().catch(() => {});
      }
    };

    ['click', 'keydown', 'touchstart'].forEach(event => {
      document.addEventListener(event, handleInteraction, { passive: true, once: true });
    });

    return () => {
      ['click', 'keydown', 'touchstart'].forEach(event => {
        document.removeEventListener(event, handleInteraction);
      });
    };
  }, []);

  const playSound = useCallback((type: 'click' | 'score' | 'gameOver' | 'win') => {
    if (!soundEnabled) return;
    
    // Get or create audio context on demand
    if (!audioContextRef.current) {
      audioContextRef.current = getOrCreateAudioContext();
    }
    
    const ctx = audioContextRef.current;
    if (!ctx) return;
    
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    
    try {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      const frequencies: Record<string, number[]> = {
        click: [800],
        score: [523, 659, 784], // C, E, G chord
        gameOver: [440, 370, 311], // Descending
        win: [523, 659, 784, 1047], // Rising victory
      };
      
      const durations: Record<string, number> = {
        click: 0.05,
        score: 0.15,
        gameOver: 0.3,
        win: 0.4,
      };
      
      const freqs = frequencies[type] || [440];
      const duration = durations[type] || 0.1;
      
      oscillator.type = 'square';
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      
      freqs.forEach((freq, i) => {
        const startTime = ctx.currentTime + (i * duration * 0.3);
        oscillator.frequency.setValueAtTime(freq, startTime);
      });
      
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      
      oscillator.start();
      oscillator.stop(ctx.currentTime + duration);
    } catch {
      // Sound playback failed - ignore
    }
  }, [soundEnabled]);

  return { soundEnabled, setSoundEnabled, playSound };
}

// ============================================
// SOUND TOGGLE BUTTON
// ============================================
interface SoundToggleProps {
  enabled: boolean;
  onToggle: () => void;
}

export function SoundToggle({ enabled, onToggle }: SoundToggleProps) {
  return (
    <button
      onClick={onToggle}
      className="p-1.5 rounded-lg bg-[#0f380f]/20 hover:bg-[#0f380f]/30 transition-colors"
      title={enabled ? 'Mute sounds' : 'Enable sounds'}
    >
      {enabled ? (
        <Volume2 size={14} className="text-[#0f380f]" />
      ) : (
        <VolumeX size={14} className="text-[#0f380f] opacity-50" />
      )}
    </button>
  );
}

// ============================================
// DIFFICULTY SELECTOR
// ============================================
type Difficulty = 'easy' | 'medium' | 'hard';

interface DifficultyConfig {
  label: string;
  color: string;
  multiplier: number;
}

export const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  easy: { label: 'EASY', color: '#10B981', multiplier: 1 },
  medium: { label: 'NORMAL', color: '#F59E0B', multiplier: 1.5 },
  hard: { label: 'HARD', color: '#EF4444', multiplier: 2 },
};

interface DifficultySelectorProps {
  difficulty: Difficulty;
  onChange: (d: Difficulty) => void;
  disabled?: boolean;
}

export function DifficultySelector({ difficulty, onChange, disabled }: DifficultySelectorProps) {
  const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];

  return (
    <div className="flex gap-1">
      {difficulties.map((d) => (
        <button
          key={d}
          onClick={() => onChange(d)}
          disabled={disabled}
          className={`
            px-2 py-0.5 text-[9px] font-bold rounded transition-all
            ${difficulty === d
              ? 'text-white shadow-md scale-105'
              : 'bg-[#0f380f]/10 text-[#0f380f] hover:bg-[#0f380f]/20'
            }
            disabled:opacity-50
          `}
          style={difficulty === d ? { backgroundColor: DIFFICULTIES[d].color } : {}}
        >
          {DIFFICULTIES[d].label}
        </button>
      ))}
    </div>
  );
}

// ============================================
// GAME STATS DISPLAY
// ============================================
interface GameStatsProps {
  stats: Array<{ label: string; value: string | number; icon?: React.ReactNode }>;
}

export function GameStats({ stats }: GameStatsProps) {
  return (
    <div className="flex justify-between w-full text-xs font-mono text-[#0f380f]">
      {stats.map((stat, i) => (
        <div key={i} className="text-center">
          <div className="opacity-60 mb-0.5 text-[9px]">{stat.label}</div>
          <div className="flex items-center justify-center gap-1 font-black">
            {stat.icon}
            {stat.value}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// CONFETTI EFFECT
// ============================================
interface ConfettiProps {
  show: boolean;
}

export function Confetti({ show }: ConfettiProps) {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; color: string }>>([]);

  useEffect(() => {
    if (show) {
      const newParticles = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        color: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'][
          Math.floor(Math.random() * 6)
        ],
      }));
      setParticles(newParticles);

      const timeout = setTimeout(() => setParticles([]), 3000);
      return () => clearTimeout(timeout);
    }
  }, [show]);

  return (
    <AnimatePresence>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ y: -20, x: `${p.x}%`, opacity: 1 }}
          animate={{ y: '100vh', rotate: 360 * 3 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 2 + Math.random(), ease: 'linear' }}
          className="fixed top-0 w-2 h-2 rounded-full pointer-events-none z-50"
          style={{ backgroundColor: p.color, left: `${p.x}%` }}
        />
      ))}
    </AnimatePresence>
  );
}
