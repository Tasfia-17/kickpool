'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gamepad2, Trophy, ArrowLeft, Zap, Box, LayoutGrid, Bomb, Target, Users, Star, Circle, Ship, Crosshair, Blocks, Hammer, Keyboard, Brain, Skull } from 'lucide-react';
import { usePokemonTheme } from '@/components/PokemonThemeProvider';
import { useSession } from 'next-auth/react';

import { useRouter } from 'next/navigation';

// Import your games
import { SnakeGame } from './SnakeGame';
import { ClickerGame } from './ClickerGame';
import { ReactionGame } from './ReactionGame';
import { MinesweeperGame } from './MinesweeperGame';
// import { TicTacToeGame } from './TicTacToeGame';
import { Game2048 } from './Game2048';
import { TetrisGame } from './TetrisGame';
import { BreakoutGame } from './BreakoutGame';
import { WhackAMoleGame } from './WhackAMoleGame';
import { TypingSpeedGame } from './TypingSpeedGame';
import { MemoryMatchGame } from './MemoryMatchGame';

interface GameHighScore {
  [key: string]: number;
}

const GAMES = [
  {
    id: 'snake',
    name: 'Ekans Run',
    desc: 'Classic Snake. Don\'t hit the walls!',
    color: '#10B981',
    icon: <LayoutGrid size={24} />,
    component: SnakeGame,
    featured: true,
  },
  {
    id: 'clicker',
    name: 'Training Dummy',
    desc: 'Test your clicking speed!',
    color: '#EF4444',
    icon: <Zap size={24} />,
    component: ClickerGame
  },
  {
    id: 'minesweeper',
    name: 'Voltorb Flip',
    desc: 'Don\'t explode!',
    color: '#F59E0B',
    icon: <Bomb size={24} />,
    component: MinesweeperGame
  },
  {
    id: 'reaction',
    name: 'Quick Draw',
    desc: 'Test your reflexes.',
    color: '#8B5CF6',
    icon: <Target size={24} />,
    component: ReactionGame
  },
  {
    id: '2048',
    name: '2048 Evolution',
    desc: 'Combine to evolve.',
    color: '#3B82F6',
    icon: <Box size={24} />,
    component: Game2048,
    featured: true,
  },
  {
    id: 'tetris',
    name: 'Tetris',
    desc: 'Stack the blocks!',
    color: '#06B6D4',
    icon: <Blocks size={24} />,
    component: TetrisGame,
    featured: true
  },
  {
    id: 'breakout',
    name: 'Breakout',
    desc: 'Break all the bricks!',
    color: '#3B82F6',
    icon: <Box size={24} />,
    component: BreakoutGame
  },
  {
    id: 'whack-a-mole',
    name: 'Whack-a-Mole',
    desc: 'Whack the moles!',
    color: '#D97706',
    icon: <Hammer size={24} />,
    component: WhackAMoleGame
  },
  {
    id: 'typing-speed',
    name: 'Typing Speed',
    desc: 'Test your WPM!',
    color: '#0EA5E9',
    icon: <Keyboard size={24} />,
    component: TypingSpeedGame
  },
  {
    id: 'memory-match',
    name: 'Memory Match',
    desc: 'Find matching pairs!',
    color: '#A855F7',
    icon: <Brain size={24} />,
    component: MemoryMatchGame
  },

];

export function MinigamesHub() {
  const router = useRouter();
  const { isDarkMode, currentTheme } = usePokemonTheme();
  const { data: session } = useSession();
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [highScores, setHighScores] = useState<GameHighScore>({});
  const [activeFilter, setActiveFilter] = useState<'all' | 'featured' | 'multiplayer' | 'single'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch high scores for all games
  useEffect(() => {
    const controller = new AbortController();
    if (session) {
      const gameTypes = ['snake', 'clicker', 'minesweeper', 'reaction', '2048'];
      Promise.all(
        gameTypes.map(type =>
          fetch(`/api/minigames/score?gameType=${type}`, { signal: controller.signal })
            .then(res => res.json())
            .then(data => ({ type, score: data.highScore || 0 }))
            .catch((error) => {
               if (error.name === 'AbortError') return null;
               return { type, score: 0 };
            })
        )
      ).then(results => {
        const validResults = results.filter(r => r !== null) as { type: string; score: number }[];
        if (validResults.length === 0) return;
        const scores: GameHighScore = {};
        validResults.forEach(r => { scores[r.type] = r.score; });
        setHighScores(scores);
      });
    }
    return () => controller.abort();
  }, [session]);

  const activeGame = GAMES.find(g => g.id === selectedGameId);
  const featuredGames = GAMES.filter(g => g.featured);

  // Filtered games based on active filter and search
  const filteredGames = GAMES.filter(game => {
    const matchesSearch = game.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.desc.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    switch (activeFilter) {
      case 'featured': return game.featured;
      default: return true;
    }
  });

  const filters = [
    { id: 'all', label: 'All Games', count: GAMES.length },
    { id: 'featured', label: 'Featured', count: featuredGames.length }
  ];

  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden bg-gray-100 dark:bg-gray-900">

      <AnimatePresence mode="wait">
        {!selectedGameId ? (
          /* === GAME SELECTOR MENU === */
          <motion.div
            key="menu"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="p-4 overflow-y-auto h-full content-start scrollbar-thin"
          >
            {/* Header */}
            <div className="mb-4 px-2">
              <h2 className="text-2xl sm:text-3xl font-black italic bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                🎮 GAME ARCADE
              </h2>
              <p className="text-xs opacity-40 mt-1">Choose a game to play • {GAMES.length} games available</p>
            </div>

            {/* Search Bar */}
            <div className="mb-4 px-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search games..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 pl-10 rounded-xl bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 focus:border-purple-500 focus:outline-none transition-all text-sm"
                />
                <Gamepad2 size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="mb-4 px-2 flex gap-2 overflow-x-auto scrollbar-thin pb-2">
              {filters.map(filter => (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${activeFilter === filter.id
                    ? 'bg-purple-500 text-white shadow-lg'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                >
                  {filter.label}
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeFilter === filter.id ? 'bg-white/20' : 'bg-gray-200 dark:bg-gray-700'
                    }`}>
                    {filter.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Games Grid */}
            {filteredGames.length === 0 ? (
              <div className="empty-state py-12">
                <div className="empty-state-icon">🎮</div>
                <div className="empty-state-title">No games found</div>
                <div className="empty-state-description">Try a different search or filter</div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {filteredGames.map((game, index) => (
                  <motion.button
                    key={game.id}
                    onClick={() => {
                      if ((game as any).href) {
                        router.push((game as any).href);
                      } else {
                        setSelectedGameId(game.id);
                      }
                    }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    whileHover={{ scale: 1.03, y: -4 }}
                    whileTap={{ scale: 0.97 }}
                    className="relative flex flex-col items-center gap-2 p-3 sm:p-4 rounded-2xl border-2 border-transparent hover:border-purple-400 dark:hover:border-purple-500 transition-all shadow-md hover:shadow-xl bg-white dark:bg-gray-800 text-center group overflow-hidden"
                  >
                    {/* Featured Badge */}
                    {game.featured && (
                      <div className="absolute -top-1 -right-1 bg-yellow-400 text-black text-[8px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                        <Star size={8} fill="currentColor" /> HOT
                      </div>
                    )}



                    {/* Game Icon */}
                    <div
                      className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform"
                      style={{ backgroundColor: game.color }}
                    >
                      {game.icon}
                    </div>

                    {/* Game Info */}
                    <div>
                      <h3 className="font-black text-xs sm:text-sm truncate max-w-full" style={{ color: game.color }}>
                        {game.name}
                      </h3>
                      <p className="text-[9px] sm:text-[10px] font-mono opacity-60 truncate max-w-full">{game.desc}</p>

                      {/* High Score */}
                      {highScores[game.id] > 0 && (
                        <div className="text-[9px] mt-1.5 flex items-center justify-center gap-1 text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5 rounded-full">
                          <Trophy size={10} /> {highScores[game.id].toLocaleString()}
                        </div>
                      )}
                    </div>

                    {/* Play Overlay */}
                    <div className="absolute inset-0 rounded-2xl bg-black/0 group-hover:bg-black/5 dark:group-hover:bg-white/5 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <span className="bg-white dark:bg-gray-900 text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                        ▶ Play
                      </span>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          /* === ACTIVE GAME CONTAINER === */
          <motion.div
            key="game"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full h-full flex flex-col"
          >
            {/* Game Header */}
            <div className="flex items-center justify-between p-2 border-b-2 border-black/10 dark:border-white/10 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm z-10 shrink-0">
              <button
                onClick={() => setSelectedGameId(null)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold bg-gray-200 dark:bg-gray-700 rounded hover:bg-red-500 hover:text-white transition-colors"
              >
                <ArrowLeft size={14} /> EJECT
              </button>
              <span className="font-black uppercase tracking-widest text-xs opacity-50">
                {activeGame?.name}
              </span>
              {highScores[activeGame?.id || ''] > 0 && (
                <div className="px-3 py-1 bg-yellow-400 text-black text-xs font-bold rounded flex items-center gap-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <Trophy size={12} /> {highScores[activeGame?.id || '']}
                </div>
              )}
            </div>

            {/* The Game Component */}
            <div className="flex-1 relative overflow-hidden bg-gray-50 dark:bg-black/20">
              {activeGame && <activeGame.component />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
