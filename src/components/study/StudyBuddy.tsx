'use client';

import { usePokemonTheme } from '@/components/PokemonThemeProvider';
import { BookOpen, Music, Coffee, Moon, Zap } from 'lucide-react';

type BuddyMode = 'studying' | 'music' | 'break' | 'sleeping';

interface StudyBuddyProps {
  mode: BuddyMode;
}

export function StudyBuddy({ mode }: StudyBuddyProps) {
  const { pokemonSprite } = usePokemonTheme();

  const getBuddyIcon = () => {
    switch (mode) {
      case 'studying':
        return <BookOpen size={64} className="text-orange-500" />;
      case 'music':
        return <Music size={64} className="text-pink-500" />;
      case 'break':
        return <Coffee size={64} className="text-amber-600" />;
      case 'sleeping':
        return <Moon size={64} className="text-blue-400" />;
      default:
        return <BookOpen size={64} className="text-orange-500" />;
    }
  };

  const getMessage = () => {
    switch (mode) {
      case 'studying':
        return { text: "Let's focus!", icon: <Zap size={20} className="inline" /> };
      case 'music':
        return { text: 'Vibing to music!', icon: <Music size={20} className="inline" /> };
      case 'break':
        return { text: 'Time for break!', icon: <Coffee size={20} className="inline" /> };
      case 'sleeping':
        return { text: 'Taking a nap...', icon: <Moon size={20} className="inline" /> };
      default:
        return { text: 'Ready to study!', icon: <BookOpen size={20} className="inline" /> };
    }
  };

  const message = getMessage();

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Cat Body (loaf shape) */}
      <div className="relative">
        {/* Cat Head - Static, no animations */}
        <div>
          <div className="text-7xl" style={{ imageRendering: 'pixelated' }}>
            {getBuddyIcon()}
          </div>
        </div>
        {/* Cat Body (loaf) - Static */}
        <div 
          className="mx-auto mt-[-12px] w-24 h-12 bg-gradient-to-b from-orange-400 to-orange-600 border-4 border-orange-700 rounded-full relative"
          style={{
            boxShadow: 'inset 0 4px 8px rgba(0,0,0,0.3), 4px 4px 0px rgba(0,0,0,0.5)',
          }}
        >
          {/* Paws */}
          <div className="absolute -left-2 top-2 w-4 h-4 bg-orange-500 border-2 border-orange-700 rounded-full" />
          <div className="absolute -right-2 top-2 w-4 h-4 bg-orange-500 border-2 border-orange-700 rounded-full" />
        </div>
      </div>
      {/* Cute Speech Bubble - Static */}
      <div className="text-center relative">
        <div className="px-5 py-3 bg-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-lg relative" style={{ fontFamily: 'VT323, monospace' }}>
          <p className="text-base font-black text-black flex items-center gap-2 justify-center">
            {message.text} {message.icon}
          </p>
          {/* Speech bubble tail */}
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-black" />
        </div>
      </div>
    </div>
  );
}
