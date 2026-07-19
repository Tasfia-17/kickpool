'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Timer, Settings } from 'lucide-react';
import { usePokemonTheme } from '@/components/PokemonThemeProvider';

type TimerMode = 'work' | 'break';

interface PomodoroTimerProps {
  onStateChange?: (state: 'studying' | 'music' | 'break' | 'sleeping') => void;
  workTime?: number; // minutes
  breakTime?: number; // minutes
  onComplete?: () => void;
}

export function PomodoroTimer({ onStateChange, workTime = 25, breakTime = 5, onComplete }: PomodoroTimerProps) {
  const { currentTheme } = usePokemonTheme();
  const [mode, setMode] = useState<TimerMode>('work');
  const [timeLeft, setTimeLeft] = useState(workTime * 60); // Convert to seconds
  const [isRunning, setIsRunning] = useState(false);
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [customWork, setCustomWork] = useState(workTime);
  const [customBreak, setCustomBreak] = useState(breakTime);

  const WORK_TIME = customWork * 60; // Convert to seconds
  const BREAK_TIME = customBreak * 60; // Convert to seconds

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            // Timer finished
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
  }, [isRunning]);

  // Update timeLeft when workTime/breakTime changes
  useEffect(() => {
    if (mode === 'work') {
      setTimeLeft(customWork * 60);
    } else {
      setTimeLeft(customBreak * 60);
    }
  }, [customWork, customBreak, mode]);

  const handleTimerComplete = () => {
    if (mode === 'work') {
      setCompletedPomodoros(prev => prev + 1);
      setMode('break');
      setTimeLeft(BREAK_TIME);
      onStateChange?.('break');
      // Play notification sound
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('Break Time! 🎉', {
          body: 'Take a 5-minute break!',
        });
      }
    } else {
      setMode('work');
      setTimeLeft(WORK_TIME);
      onStateChange?.('studying');
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('Back to Work! 💪', {
          body: 'Time for another 25-minute focus session.',
        });
      }
    }
    setIsRunning(false);
  };

  useEffect(() => {
    onStateChange?.(mode === 'work' ? 'studying' : 'break');
  }, [mode, onStateChange]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const reset = () => {
    setIsRunning(false);
    setTimeLeft(mode === 'work' ? WORK_TIME : BREAK_TIME);
  };

  const toggle = () => {
    setIsRunning(!isRunning);
  };

  const progress = mode === 'work' 
    ? ((WORK_TIME - timeLeft) / WORK_TIME) * 100
    : ((BREAK_TIME - timeLeft) / BREAK_TIME) * 100;

  return (
    <div className="flex flex-col items-center space-y-6 relative" style={{ fontFamily: 'VT323, monospace' }}>
      {/* Settings Button */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="absolute top-0 right-0 p-2 border-2 border-black bg-gray-200 hover:bg-gray-300 transition-all z-10"
        title="Settings"
      >
        <Settings size={14} />
      </button>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-8 right-0 z-50 border-4 border-black bg-white p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] min-w-[200px]">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold mb-1 text-black">Work Time (min)</label>
              <input
                type="number"
                min="1"
                max="120"
                value={customWork}
                onChange={(e) => {
                  const val = Math.max(1, Math.min(120, parseInt(e.target.value) || 25));
                  setCustomWork(val);
                  if (mode === 'work' && !isRunning) {
                    setTimeLeft(val * 60);
                  }
                }}
                className="w-full px-2 py-1 border-2 border-black text-black font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-black">Break Time (min)</label>
              <input
                type="number"
                min="1"
                max="60"
                value={customBreak}
                onChange={(e) => {
                  const val = Math.max(1, Math.min(60, parseInt(e.target.value) || 5));
                  setCustomBreak(val);
                  if (mode === 'break' && !isRunning) {
                    setTimeLeft(val * 60);
                  }
                }}
                className="w-full px-2 py-1 border-2 border-black text-black font-bold"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setCustomWork(25);
                  setCustomBreak(5);
                  if (mode === 'work') setTimeLeft(25 * 60);
                  else setTimeLeft(5 * 60);
                }}
                className="flex-1 px-2 py-1 border-2 border-black bg-blue-400 text-white text-xs font-bold hover:bg-blue-500"
              >
                Classic
              </button>
              <button
                onClick={() => {
                  setCustomWork(45);
                  setCustomBreak(15);
                  if (mode === 'work') setTimeLeft(45 * 60);
                  else setTimeLeft(15 * 60);
                }}
                className="flex-1 px-2 py-1 border-2 border-black bg-purple-400 text-white text-xs font-bold hover:bg-purple-500"
              >
                Long
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mode Indicator - More Cute */}
      <div 
        className={`px-6 py-3 border-4 border-black font-black text-base shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
          mode === 'work' ? 'bg-red-400 text-white' : 'bg-green-400 text-white'
        }`}
        style={{ fontFamily: 'VT323, monospace', textShadow: '2px 2px 0px rgba(0,0,0,0.3)' }}
      >
        {mode === 'work' ? '⚡ FOCUS TIME ⚡' : '☕ BREAK TIME ☕'}
      </div>

      {/* Timer Display - More Cute */}
      <div className="relative">
        <div 
          className="w-56 h-56 rounded-full border-6 border-black flex items-center justify-center font-mono text-5xl font-black relative"
          style={{ 
            backgroundColor: mode === 'work' ? '#fee2e2' : '#dcfce7',
            boxShadow: 'inset 4px 4px 8px rgba(0,0,0,0.2), 6px 6px 0px rgba(0,0,0,0.8)',
          }}
        >
          {/* Decorative dots */}
          <div className="absolute top-4 left-4 w-3 h-3 bg-black rounded-full" />
          <div className="absolute top-4 right-4 w-3 h-3 bg-black rounded-full" />
          <div className="absolute bottom-4 left-4 w-3 h-3 bg-black rounded-full" />
          <div className="absolute bottom-4 right-4 w-3 h-3 bg-black rounded-full" />
          <span 
            style={{ 
              color: mode === 'work' ? '#dc2626' : '#16a34a',
              textShadow: '3px 3px 0px rgba(0,0,0,0.3)',
              fontFamily: 'VT323, monospace',
            }}
          >
            {formatTime(timeLeft)}
          </span>
        </div>
        
        {/* Progress Ring */}
        <svg className="absolute inset-0 w-48 h-48 transform -rotate-90">
          <circle
            cx="96"
            cy="96"
            r="92"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeDasharray={`${2 * Math.PI * 92}`}
            strokeDashoffset={`${2 * Math.PI * 92 * (1 - progress / 100)}`}
            className={mode === 'work' ? 'text-red-500' : 'text-green-500'}
            opacity="0.3"
          />
        </svg>
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <button
          onClick={toggle}
          className="p-3 border-2 border-black bg-white hover:bg-gray-100 active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] font-bold transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
        >
          {isRunning ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <button
          onClick={reset}
          className="p-3 border-2 border-black bg-white hover:bg-gray-100 active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] font-bold transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
        >
          <RotateCcw size={20} />
        </button>
      </div>

      {/* Completed Count */}
      <div className="text-center">
        <p className="text-sm font-bold text-black flex items-center justify-center gap-1">
          Completed: {completedPomodoros} <Timer size={16} className="text-red-500" />
        </p>
      </div>
    </div>
  );
}

