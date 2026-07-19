'use client';

import { useState, useEffect } from 'react';
import { Target, Trophy, Calendar } from 'lucide-react';

export function StudyGoals() {
  const [dailyGoal, setDailyGoal] = useState(120); // minutes
  const [weeklyGoal, setWeeklyGoal] = useState(600); // minutes
  const [todayProgress, setTodayProgress] = useState(0);
  const [weekProgress, setWeekProgress] = useState(0);

  useEffect(() => {
    // Load goals from localStorage
    try {
      const saved = localStorage.getItem('study-goals');
      if (saved) {
        const parsed = JSON.parse(saved);
        setDailyGoal(parsed.daily || 120);
        setWeeklyGoal(parsed.weekly || 600);
      }
    } catch {
      // Ignore
    }

    // Load progress
    try {
      const stats = localStorage.getItem('study-stats');
      if (stats) {
        const parsed = JSON.parse(stats);
        setTodayProgress(parsed.todayTime || 0);
        setWeekProgress(parsed.weekTime || 0);
      }
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    // Save goals
    localStorage.setItem('study-goals', JSON.stringify({ daily: dailyGoal, weekly: weeklyGoal }));
  }, [dailyGoal, weeklyGoal]);

  const dailyPercent = Math.min(100, (todayProgress / dailyGoal) * 100);
  const weeklyPercent = Math.min(100, (weekProgress / weeklyGoal) * 100);

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <div className="space-y-4" style={{ fontFamily: 'VT323, monospace' }}>
      {/* Daily Goal */}
      <div className="border-4 border-black bg-gradient-to-br from-blue-100 to-blue-200 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-blue-600" />
            <span className="text-sm font-black text-black">Daily Goal</span>
          </div>
          <input
            type="number"
            min="0"
            max="1440"
            value={dailyGoal}
            onChange={(e) => setDailyGoal(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-20 px-2 py-1 border-2 border-black text-xs font-bold text-black bg-white"
          />
        </div>
        <div className="mb-2">
          <div className="flex justify-between text-xs font-bold text-black mb-1">
            <span>{formatTime(todayProgress)} / {formatTime(dailyGoal)}</span>
            <span>{Math.round(dailyPercent)}%</span>
          </div>
          <div className="w-full h-6 bg-white border-2 border-black relative overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-300"
              style={{ width: `${dailyPercent}%` }}
            />
            {dailyPercent >= 100 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Trophy size={16} className="text-yellow-400" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Weekly Goal */}
      <div className="border-4 border-black bg-gradient-to-br from-purple-100 to-purple-200 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Target size={18} className="text-purple-600" />
            <span className="text-sm font-black text-black">Weekly Goal</span>
          </div>
          <input
            type="number"
            min="0"
            max="10080"
            value={weeklyGoal}
            onChange={(e) => setWeeklyGoal(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-20 px-2 py-1 border-2 border-black text-xs font-bold text-black bg-white"
          />
        </div>
        <div className="mb-2">
          <div className="flex justify-between text-xs font-bold text-black mb-1">
            <span>{formatTime(weekProgress)} / {formatTime(weeklyGoal)}</span>
            <span>{Math.round(weeklyPercent)}%</span>
          </div>
          <div className="w-full h-6 bg-white border-2 border-black relative overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-400 to-purple-600 transition-all duration-300"
              style={{ width: `${weeklyPercent}%` }}
            />
            {weeklyPercent >= 100 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Trophy size={16} className="text-yellow-400" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
