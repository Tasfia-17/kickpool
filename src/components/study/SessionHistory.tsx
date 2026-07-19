'use client';

import { useState, useEffect } from 'react';
import { Clock, Calendar, TrendingUp } from 'lucide-react';

interface StudySession {
  id: string;
  startTime: Date;
  endTime: Date;
  duration: number; // minutes
  pomodoros: number;
}

export function SessionHistory() {
  const [sessions, setSessions] = useState<StudySession[]>([]);

  useEffect(() => {
    // Load sessions from localStorage
    try {
      const saved = localStorage.getItem('study-sessions');
      if (saved) {
        const parsed = JSON.parse(saved);
        setSessions(parsed.map((s: any) => ({
          ...s,
          startTime: new Date(s.startTime),
          endTime: new Date(s.endTime),
        })).slice(-10)); // Last 10 sessions
      }
    } catch (e) {
      console.error('Failed to load sessions:', e);
    }
  }, []);

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto" style={{ fontFamily: 'VT323, monospace' }}>
      {sessions.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">No sessions yet. Start studying!</p>
      ) : (
        sessions.map((session) => (
          <div
            key={session.id}
            className="border-4 border-black bg-gradient-to-br from-blue-100 to-purple-100 p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-blue-600" />
                <span className="text-xs font-bold text-black">{formatDate(session.startTime)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-purple-600" />
                <span className="text-xs font-black text-black">{formatTime(session.duration)}</span>
              </div>
            </div>
            {session.pomodoros > 0 && (
              <div className="flex items-center gap-1">
                <TrendingUp size={12} className="text-green-600" />
                <span className="text-xs font-bold text-black">{session.pomodoros} Pomodoro{session.pomodoros !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
