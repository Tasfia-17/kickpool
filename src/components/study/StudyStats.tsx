'use client';

import { useState, useEffect } from 'react';
import { Clock, TrendingUp, Target, Award } from 'lucide-react';

interface StudyStats {
  totalTime: number; // minutes
  sessions: number;
  averageSession: number; // minutes
  todayTime: number; // minutes
  weekTime: number; // minutes
}

export function StudyStats() {
  const [stats, setStats] = useState<StudyStats>({
    totalTime: 0,
    sessions: 0,
    averageSession: 0,
    todayTime: 0,
    weekTime: 0,
  });

  useEffect(() => {
    // Load stats from localStorage
    try {
      const saved = localStorage.getItem('study-stats');
      if (saved) {
        const parsed = JSON.parse(saved);
        setStats(parsed);
      }
    } catch (e) {
      console.error('Failed to load stats:', e);
    }
  }, []);

  // Update stats periodically
  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const saved = localStorage.getItem('study-stats');
        if (saved) {
          const parsed = JSON.parse(saved);
          setStats(parsed);
        }
      } catch {
        // Ignore
      }
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <div className="space-y-3" style={{ fontFamily: 'VT323, monospace' }}>
      <div className="grid grid-cols-2 gap-3">
        <div className="border-4 border-black bg-gradient-to-br from-blue-100 to-blue-200 p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={20} className="text-blue-600" />
            <span className="text-xs font-bold text-black">Total Time</span>
          </div>
          <div className="text-2xl font-black text-black">{formatTime(stats.totalTime)}</div>
        </div>

        <div className="border-4 border-black bg-gradient-to-br from-green-100 to-green-200 p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center gap-2 mb-1">
            <Target size={20} className="text-green-600" />
            <span className="text-xs font-bold text-black">Sessions</span>
          </div>
          <div className="text-2xl font-black text-black">{stats.sessions}</div>
        </div>

        <div className="border-4 border-black bg-gradient-to-br from-purple-100 to-purple-200 p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={20} className="text-purple-600" />
            <span className="text-xs font-bold text-black">Today</span>
          </div>
          <div className="text-2xl font-black text-black">{formatTime(stats.todayTime)}</div>
        </div>

        <div className="border-4 border-black bg-gradient-to-br from-orange-100 to-orange-200 p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center gap-2 mb-1">
            <Award size={20} className="text-orange-600" />
            <span className="text-xs font-bold text-black">Avg Session</span>
          </div>
          <div className="text-2xl font-black text-black">{formatTime(stats.averageSession)}</div>
        </div>
      </div>

      <div className="border-4 border-black bg-gradient-to-br from-pink-100 to-pink-200 p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center gap-2 mb-1">
          <Clock size={20} className="text-pink-600" />
          <span className="text-xs font-bold text-black">This Week</span>
        </div>
        <div className="text-2xl font-black text-black">{formatTime(stats.weekTime)}</div>
      </div>
    </div>
  );
}
