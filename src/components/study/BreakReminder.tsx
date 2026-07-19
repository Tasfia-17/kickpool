'use client';

import { useState, useEffect } from 'react';
import { Coffee, Eye, Activity } from 'lucide-react';

interface BreakSuggestion {
  type: 'eye' | 'stretch' | 'walk' | 'drink';
  message: string;
  icon: React.ReactNode;
}

const BREAK_SUGGESTIONS: BreakSuggestion[] = [
  { type: 'eye', message: 'Look away for 20 seconds!', icon: <Eye size={20} /> },
  { type: 'stretch', message: 'Stretch your arms and back!', icon: <Activity size={20} /> },
  { type: 'walk', message: 'Take a 2-minute walk!', icon: <Coffee size={20} /> },
  { type: 'drink', message: 'Drink some water!', icon: <Coffee size={20} /> },
];

export function BreakReminder({ studyTimeMinutes }: { studyTimeMinutes: number }) {
  const [showReminder, setShowReminder] = useState(false);
  const [suggestion, setSuggestion] = useState<BreakSuggestion | null>(null);

  useEffect(() => {
    // Show reminder every 25 minutes
    if (studyTimeMinutes > 0 && studyTimeMinutes % 25 === 0 && studyTimeMinutes > 0) {
      const randomSuggestion = BREAK_SUGGESTIONS[Math.floor(Math.random() * BREAK_SUGGESTIONS.length)];
      setSuggestion(randomSuggestion);
      setShowReminder(true);

      // Auto-hide after 10 seconds
      setTimeout(() => {
        setShowReminder(false);
      }, 10000);
    }
  }, [studyTimeMinutes]);

  if (!showReminder || !suggestion) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-bounce">
      <div className="bg-gradient-to-br from-yellow-100 to-orange-200 border-4 border-black p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] max-w-xs">
        <div className="flex items-center gap-3 mb-2">
          {suggestion.icon}
          <span className="text-sm font-black text-black" style={{ fontFamily: 'VT323, monospace' }}>
            Break Time!
          </span>
        </div>
        <p className="text-xs font-bold text-black mb-2" style={{ fontFamily: 'VT323, monospace' }}>
          {suggestion.message}
        </p>
        <button
          onClick={() => setShowReminder(false)}
          className="w-full px-3 py-1 border-2 border-black bg-green-400 hover:bg-green-500 text-white text-xs font-bold transition-all"
          style={{ fontFamily: 'VT323, monospace' }}
        >
          Got it!
        </button>
      </div>
    </div>
  );
}
