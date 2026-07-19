'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSession } from 'next-auth/react';
import { GameBoyContainer } from './GameBoyContainer';

interface Card {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

const EMOJI_SETS = {
  animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮'],
  food: ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍑', '🍒', '🥝', '🍕'],
  space: ['🌟', '⭐', '🌙', '☀️', '🌍', '🚀', '🛸', '🌌', '💫', '✨', '🌠', '🪐'],
  sports: ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏓', '🎱', '🥊', '🎯', '🏆', '🎳'],
};

type Theme = keyof typeof EMOJI_SETS;
type GridSize = 4 | 6 | 8;

export function MemoryMatchGame() {
  const { data: session } = useSession();

  const [theme, setTheme] = useState<Theme>('animals');
  const [gridSize, setGridSize] = useState<GridSize>(4);
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'won'>('menu');
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [bestTime, setBestTime] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Fetch high score
  useEffect(() => {
    if (session) {
      const controller = new AbortController();
      fetch('/api/minigames/score?gameType=memory-match', { signal: controller.signal })
        .then(res => res.json())
        .then(data => setHighScore(data.highScore || 0))
        .catch((error) => {
          if (error.name !== 'AbortError') console.error('Failed to fetch high score:', error);
        });
      return () => controller.abort();
    }
  }, [session]);

  const initGame = useCallback(() => {
    const pairsNeeded = (gridSize * gridSize) / 2;
    const emojis = EMOJI_SETS[theme].slice(0, pairsNeeded);
    const cardPairs = [...emojis, ...emojis];

    const shuffled = cardPairs
      .map((emoji, index) => ({
        id: index,
        emoji,
        isFlipped: false,
        isMatched: false,
      }))
      .sort(() => Math.random() - 0.5);

    setCards(shuffled);
    setFlippedCards([]);
    setMoves(0);
    setMatches(0);
    setTimeElapsed(0);
    setScore(0);
    setGameState('playing');
  }, [theme, gridSize]);

  // Timer
  useEffect(() => {
    if (gameState !== 'playing') return;

    timerRef.current = setInterval(() => {
      setTimeElapsed(t => t + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState]);

  // Check for win
  useEffect(() => {
    const totalPairs = (gridSize * gridSize) / 2;
    if (matches === totalPairs && gameState === 'playing') {
      setGameState('won');
      if (timerRef.current) clearInterval(timerRef.current);

      // Calculate score
      const baseScore = totalPairs * 100;
      const timeBonus = Math.max(0, (300 - timeElapsed) * 2);
      const moveBonus = Math.max(0, (totalPairs * 3 - moves) * 10);
      const finalScore = baseScore + timeBonus + moveBonus;
      setScore(finalScore);

      // Update best time
      if (!bestTime || timeElapsed < bestTime) {
        setBestTime(timeElapsed);
      }

      // Save score
      if (session && finalScore > highScore) {
        fetch('/api/minigames/score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameType: 'memory-match', score: finalScore }),
        }).then(() => setHighScore(finalScore));
      }
    }
  }, [matches, gridSize, gameState, timeElapsed, moves, bestTime, session, highScore]);

  const handleCardClick = (cardId: number) => {
    if (gameState !== 'playing') return;
    if (flippedCards.length >= 2) return;
    if (cards[cardId].isFlipped || cards[cardId].isMatched) return;

    const newFlipped = [...flippedCards, cardId];
    setFlippedCards(newFlipped);

    setCards(prev => prev.map(card =>
      card.id === cardId ? { ...card, isFlipped: true } : card
    ));

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);

      const [first, second] = newFlipped;
      if (cards[first].emoji === cards[second].emoji) {
        // Match!
        setTimeout(() => {
          setCards(prev => prev.map(card =>
            card.id === first || card.id === second
              ? { ...card, isMatched: true }
              : card
          ));
          setMatches(m => m + 1);
          setFlippedCards([]);
        }, 300);
      } else {
        // No match
        setTimeout(() => {
          setCards(prev => prev.map(card =>
            card.id === first || card.id === second
              ? { ...card, isFlipped: false }
              : card
          ));
          setFlippedCards([]);
        }, 800);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const totalPairs = (gridSize * gridSize) / 2;

  return (
    <GameBoyContainer isPlaying={gameState === 'playing'} gameOver={false}>
      <div className="w-full h-full flex flex-col bg-gradient-to-b from-indigo-900 to-purple-900">

        {/* Header */}
        <div className="flex items-center justify-between p-2 bg-black/30 border-b border-purple-700">
          <div className="text-xs font-mono text-purple-300">
            ⏱️ {formatTime(timeElapsed)}
          </div>
          <div className="text-xs text-purple-300">
            Moves: {moves}
          </div>
          <div className="text-xs text-purple-300">
            {matches}/{totalPairs}
          </div>
        </div>

        {/* Game grid */}
        <div className="flex-1 flex items-center justify-center p-2">
          <div
            className="grid gap-1.5"
            style={{
              gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
              maxWidth: gridSize === 8 ? '280px' : gridSize === 6 ? '240px' : '200px',
            }}
          >
            {cards.map(card => (
              <motion.button
                key={card.id}
                onClick={() => handleCardClick(card.id)}
                whileHover={!card.isFlipped && !card.isMatched ? { scale: 1.05 } : {}}
                whileTap={!card.isFlipped && !card.isMatched ? { scale: 0.95 } : {}}
                className={`aspect-square rounded-lg flex items-center justify-center transition-all duration-200 ${
                  card.isMatched
                    ? 'bg-green-600/50 border-2 border-green-400'
                    : card.isFlipped
                    ? 'bg-white border-2 border-purple-400'
                    : 'bg-purple-700 border-2 border-purple-500 hover:border-purple-300'
                }`}
                style={{
                  fontSize: gridSize === 8 ? '16px' : gridSize === 6 ? '20px' : '24px',
                  minWidth: gridSize === 8 ? '32px' : '40px',
                  minHeight: gridSize === 8 ? '32px' : '40px',
                }}
              >
                {(card.isFlipped || card.isMatched) ? (
                  <motion.span
                    initial={{ rotateY: 180 }}
                    animate={{ rotateY: 0 }}
                  >
                    {card.emoji}
                  </motion.span>
                ) : (
                  <span className="text-purple-400 text-lg">?</span>
                )}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Menu overlay */}
        <AnimatePresence>
          {gameState === 'menu' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 flex items-center justify-center"
            >
              <div className="text-center">
                <h1 className="text-xl font-black text-purple-400 mb-4">🎴 MEMORY MATCH</h1>

                {/* Theme selector */}
                <p className="text-xs text-gray-500 mb-2">Theme</p>
                <div className="flex gap-2 justify-center mb-4">
                  {(Object.keys(EMOJI_SETS) as Theme[]).map(t => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={`px-2 py-1 rounded text-xs ${
                        theme === t
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-700 text-gray-300'
                      }`}
                    >
                      {EMOJI_SETS[t][0]} {t}
                    </button>
                  ))}
                </div>

                {/* Grid size selector */}
                <p className="text-xs text-gray-500 mb-2">Grid Size</p>
                <div className="flex gap-2 justify-center mb-4">
                  {([4, 6, 8] as GridSize[]).map(size => (
                    <button
                      key={size}
                      onClick={() => setGridSize(size)}
                      className={`px-3 py-1 rounded text-xs ${
                        gridSize === size
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-700 text-gray-300'
                      }`}
                    >
                      {size}x{size}
                    </button>
                  ))}
                </div>

                {highScore > 0 && (
                  <p className="text-xs text-yellow-400 mb-4">
                    🏆 Best Score: {highScore}
                  </p>
                )}

                <button
                  onClick={initGame}
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded"
                >
                  START
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Win overlay */}
        <AnimatePresence>
          {gameState === 'won' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 flex items-center justify-center"
            >
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
                  className="text-5xl mb-4"
                >
                  🎉
                </motion.div>
                <h2 className="text-xl font-black text-green-400 mb-2">COMPLETE!</h2>

                <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
                  <div className="bg-gray-800 p-2 rounded">
                    <p className="text-gray-500">Time</p>
                    <p className="text-lg font-bold text-purple-400">{formatTime(timeElapsed)}</p>
                  </div>
                  <div className="bg-gray-800 p-2 rounded">
                    <p className="text-gray-500">Moves</p>
                    <p className="text-lg font-bold text-purple-400">{moves}</p>
                  </div>
                </div>

                <p className="text-yellow-400 text-lg font-bold mb-2">
                  Score: {score}
                </p>

                {score > highScore && (
                  <p className="text-green-400 text-sm mb-4">🏆 NEW HIGH SCORE!</p>
                )}

                <div className="flex gap-2 justify-center">
                  <button
                    onClick={initGame}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded"
                  >
                    PLAY AGAIN
                  </button>
                  <button
                    onClick={() => setGameState('menu')}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-bold rounded"
                  >
                    MENU
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </GameBoyContainer>
  );
}
