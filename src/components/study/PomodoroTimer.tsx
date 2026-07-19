'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Play, Pause, RotateCcw, Timer, Settings, Coffee, Zap, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type TimerMode = 'work' | 'break' | 'longBreak';

interface PomodoroTimerProps {
  onStateChange?: (state: 'studying' | 'music' | 'break' | 'sleeping') => void;
  workTime?: number; // minutes
  breakTime?: number; // minutes
  longBreakTime?: number; // minutes
  onComplete?: () => void;
}

// Preset configurations
const PRESETS = {
  classic: { work: 25, break: 5, longBreak: 15, name: 'Classic', icon: '🍅' },
  short: { work: 15, break: 3, longBreak: 10, name: 'Short Sprint', icon: '⚡' },
  long: { work: 45, break: 10, longBreak: 20, name: 'Deep Focus', icon: '🎯' },
  custom: { work: 25, break: 5, longBreak: 15, name: 'Custom', icon: '⚙️' },
};

export function PomodoroTimer({
  onStateChange,
  workTime = 25,
  breakTime = 5,
  longBreakTime = 15,
  onComplete
}: PomodoroTimerProps) {
  const [mode, setMode] = useState<TimerMode>('work');
  const [timeLeft, setTimeLeft] = useState(workTime * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [currentPreset, setCurrentPreset] = useState<keyof typeof PRESETS>('classic');

  // Custom settings
  const [customWork, setCustomWork] = useState(workTime);
  const [customBreak, setCustomBreak] = useState(breakTime);
  const [customLongBreak, setCustomLongBreak] = useState(longBreakTime);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Calculate total time for current mode
  const totalTime = useMemo(() => {
    switch (mode) {
      case 'work': return customWork * 60;
      case 'break': return customBreak * 60;
      case 'longBreak': return customLongBreak * 60;
      default: return customWork * 60;
    }
  }, [mode, customWork, customBreak, customLongBreak]);

  // Calculate progress percentage
  const progress = useMemo(() => {
    return ((totalTime - timeLeft) / totalTime) * 100;
  }, [totalTime, timeLeft]);

  // Format time display
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (typeof window !== 'undefined') {
      // Try to play a notification sound
      try {
        const audio = new Audio('/sounds/notification.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {
          // Fallback to a beep using Web Audio API
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          oscillator.frequency.value = 800;
          oscillator.type = 'sine';
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.5);
        });
      } catch {
        console.log('Could not play notification sound');
      }
    }
  }, []);

  // Handle timer completion
  const handleTimerComplete = useCallback(() => {
    playNotificationSound();

    if (mode === 'work') {
      const newCompletedCount = completedPomodoros + 1;
      setCompletedPomodoros(newCompletedCount);
      onComplete?.();

      // Every 4 pomodoros, take a long break
      if (newCompletedCount % 4 === 0) {
        setMode('longBreak');
        setTimeLeft(customLongBreak * 60);
        onStateChange?.('break');
        showNotification('Time for a long break! 🎉', 'You completed 4 pomodoros! Take 15-20 minutes.');
      } else {
        setMode('break');
        setTimeLeft(customBreak * 60);
        onStateChange?.('break');
        showNotification('Break Time! ☕', `Great work! Take a ${customBreak}-minute break.`);
      }
    } else {
      setMode('work');
      setTimeLeft(customWork * 60);
      onStateChange?.('studying');
      showNotification('Back to Work! 💪', 'Focus time - you got this!');
    }

    setIsRunning(false);
  }, [mode, completedPomodoros, customWork, customBreak, customLongBreak, onComplete, onStateChange, playNotificationSound]);

  // Show browser notification
  const showNotification = useCallback((title: string, body: string) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/icon-192.png' });
    }
  }, []);

  // Timer effect
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, handleTimerComplete]);

  // Request notification permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Report state changes
  useEffect(() => {
    onStateChange?.(mode === 'work' ? 'studying' : 'break');
  }, [mode, onStateChange]);

  // Apply preset
  const applyPreset = useCallback((preset: keyof typeof PRESETS) => {
    const config = PRESETS[preset];
    setCustomWork(config.work);
    setCustomBreak(config.break);
    setCustomLongBreak(config.longBreak);
    setCurrentPreset(preset);

    // Reset timer if not running
    if (!isRunning) {
      setTimeLeft(config.work * 60);
      setMode('work');
    }
  }, [isRunning]);

  // Reset timer
  const resetTimer = useCallback(() => {
    setIsRunning(false);
    setMode('work');
    setTimeLeft(customWork * 60);
  }, [customWork]);

  // Toggle timer
  const toggleTimer = useCallback(() => {
    setIsRunning(prev => !prev);
  }, []);

  // Skip current session
  const skipSession = useCallback(() => {
    handleTimerComplete();
  }, [handleTimerComplete]);

  // Get mode config
  const modeConfig = useMemo(() => {
    switch (mode) {
      case 'work':
        return { label: 'FOCUS TIME', color: '#ec4899', bgColor: '#fce7f3', icon: Zap, emoji: '⚡' };
      case 'break':
        return { label: 'BREAK TIME', color: '#22c55e', bgColor: '#dcfce7', icon: Coffee, emoji: '☕' };
      case 'longBreak':
        return { label: 'LONG BREAK', color: '#3b82f6', bgColor: '#dbeafe', icon: Target, emoji: '🎯' };
    }
  }, [mode]);

  return (
    <div className="flex flex-col items-center space-y-5 relative" style={{ fontFamily: 'VT323, monospace' }}>
      {/* Settings Button */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className={`absolute top-0 right-0 p-2 border-2 border-black transition-all z-10 ${
          showSettings ? 'bg-pink-400 text-white' : 'bg-gray-200 hover:bg-gray-300'
        }`}
        title="Settings"
        aria-label="Timer settings"
      >
        <Settings size={14} className={showSettings ? 'animate-spin' : ''} />
      </button>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-10 right-0 z-50 border-4 border-black bg-white dark:bg-gray-900 p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] min-w-[240px]"
          >
            {/* Presets */}
            <div className="mb-4">
              <label className="block text-xs font-black mb-2 text-black dark:text-white">PRESETS</label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(PRESETS) as [keyof typeof PRESETS, typeof PRESETS[keyof typeof PRESETS]][]).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => applyPreset(key)}
                    className={`p-2 border-2 border-black text-xs font-bold transition-all ${
                      currentPreset === key
                        ? 'bg-pink-400 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                        : 'bg-gray-100 dark:bg-gray-800 text-black dark:text-white hover:bg-gray-200'
                    }`}
                  >
                    {preset.icon} {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Settings */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold mb-1 text-black dark:text-white">
                  Work Time: {customWork} min
                </label>
                <input
                  type="range"
                  min="5"
                  max="90"
                  value={customWork}
                  onChange={(e) => {
                    setCustomWork(parseInt(e.target.value));
                    setCurrentPreset('custom');
                    if (!isRunning && mode === 'work') {
                      setTimeLeft(parseInt(e.target.value) * 60);
                    }
                  }}
                  className="w-full accent-pink-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-black dark:text-white">
                  Break Time: {customBreak} min
                </label>
                <input
                  type="range"
                  min="1"
                  max="30"
                  value={customBreak}
                  onChange={(e) => {
                    setCustomBreak(parseInt(e.target.value));
                    setCurrentPreset('custom');
                    if (!isRunning && mode === 'break') {
                      setTimeLeft(parseInt(e.target.value) * 60);
                    }
                  }}
                  className="w-full accent-green-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-black dark:text-white">
                  Long Break: {customLongBreak} min
                </label>
                <input
                  type="range"
                  min="5"
                  max="45"
                  value={customLongBreak}
                  onChange={(e) => {
                    setCustomLongBreak(parseInt(e.target.value));
                    setCurrentPreset('custom');
                    if (!isRunning && mode === 'longBreak') {
                      setTimeLeft(parseInt(e.target.value) * 60);
                    }
                  }}
                  className="w-full accent-blue-500"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mode Indicator */}
      <motion.div
        layout
        className="px-5 py-2 border-4 border-black font-black text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2"
        style={{
          backgroundColor: modeConfig.color,
          color: 'white',
          textShadow: '2px 2px 0px rgba(0,0,0,0.3)'
        }}
      >
        <span>{modeConfig.emoji}</span>
        <span>{modeConfig.label}</span>
        <span>{modeConfig.emoji}</span>
      </motion.div>

      {/* Circular Timer Display */}
      <div className="relative">
        <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill={modeConfig.bgColor}
            stroke="black"
            strokeWidth="3"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke={modeConfig.color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${progress * 2.64} ${264 - progress * 2.64}`}
            className="transition-all duration-1000 ease-linear"
          />
          {/* Inner decorative circle */}
          <circle
            cx="50"
            cy="50"
            r="38"
            fill="none"
            stroke="black"
            strokeWidth="2"
            strokeDasharray="4 4"
            opacity="0.3"
          />
        </svg>

        {/* Timer Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            key={timeLeft}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            className="text-5xl font-black"
            style={{
              color: modeConfig.color,
              textShadow: '3px 3px 0px rgba(0,0,0,0.2)',
            }}
          >
            {formatTime(timeLeft)}
          </motion.span>

          {/* Pomodoro count */}
          <div className="flex items-center gap-1 mt-1">
            {[...Array(Math.min(completedPomodoros % 4 + (isRunning && mode === 'work' ? 0 : 0), 4))].map((_, i) => (
              <span key={i} className="text-lg">🍅</span>
            ))}
            {completedPomodoros % 4 === 0 && completedPomodoros > 0 && !isRunning && (
              <span className="text-sm font-bold text-green-500">Set complete!</span>
            )}
          </div>
        </div>

        {/* Decorative corner dots */}
        <div className="absolute top-2 left-2 w-2 h-2 bg-black rounded-full opacity-30" />
        <div className="absolute top-2 right-2 w-2 h-2 bg-black rounded-full opacity-30" />
        <div className="absolute bottom-2 left-2 w-2 h-2 bg-black rounded-full opacity-30" />
        <div className="absolute bottom-2 right-2 w-2 h-2 bg-black rounded-full opacity-30" />
      </div>

      {/* Control Buttons */}
      <div className="flex gap-3">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={resetTimer}
          className="p-3 border-2 border-black bg-gray-200 hover:bg-gray-300 active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
          title="Reset"
          aria-label="Reset timer"
        >
          <RotateCcw size={20} />
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={toggleTimer}
          className={`p-4 border-2 border-black text-white active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
            isRunning
              ? 'bg-yellow-500 hover:bg-yellow-600'
              : 'bg-green-500 hover:bg-green-600'
          }`}
          title={isRunning ? 'Pause' : 'Start'}
          aria-label={isRunning ? 'Pause timer' : 'Start timer'}
        >
          {isRunning ? <Pause size={24} /> : <Play size={24} />}
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={skipSession}
          className="p-3 border-2 border-black bg-gray-200 hover:bg-gray-300 active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] text-xs font-bold"
          title="Skip to next"
          aria-label="Skip to next session"
        >
          Skip
        </motion.button>
      </div>

      {/* Session Stats */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1 font-bold text-black dark:text-white">
          <Timer size={16} className="text-red-500" />
          <span>{completedPomodoros} completed</span>
        </div>
        <div className="text-gray-500 dark:text-gray-400">
          ~{Math.floor(completedPomodoros * customWork / 60)}h {(completedPomodoros * customWork) % 60}m focused
        </div>
      </div>

      {/* Mode Switcher */}
      <div className="flex gap-2 border-2 border-black p-1 bg-gray-100 dark:bg-gray-800">
        {(['work', 'break', 'longBreak'] as TimerMode[]).map((m) => {
          const configs = {
            work: { label: 'Work', color: '#ec4899' },
            break: { label: 'Break', color: '#22c55e' },
            longBreak: { label: 'Long', color: '#3b82f6' },
          };
          const cfg = configs[m];
          return (
            <button
              key={m}
              onClick={() => {
                if (!isRunning) {
                  setMode(m);
                  setTimeLeft(m === 'work' ? customWork * 60 : m === 'break' ? customBreak * 60 : customLongBreak * 60);
                }
              }}
              disabled={isRunning}
              className={`px-3 py-1 text-xs font-bold transition-all ${
                mode === m
                  ? 'text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                  : 'bg-transparent hover:bg-gray-200 dark:hover:bg-gray-700 text-black dark:text-white'
              } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={mode === m ? { backgroundColor: cfg.color } : {}}
            >
              {cfg.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

