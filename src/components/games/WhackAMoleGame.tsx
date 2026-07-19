'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSession } from 'next-auth/react';
import { GameBoyContainer } from './GameBoyContainer';

interface Mole {
  id: number;
  active: boolean;
  isGolden: boolean;
  isBomb: boolean;
}

export function WhackAMoleGame() {
  const { data: session } = useSession();

  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(60);
  const [combo, setCombo] = useState(0);
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [moles, setMoles] = useState<Mole[]>(() =>
    Array(9).fill(null).map((_, i) => ({ id: i, active: false, isGolden: false, isBomb: false }))
  );
  const [difficulty, setDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal');
  const [showHit, setShowHit] = useState<number | null>(null);

  const timerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const moleTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const lastMoleRef = useRef<number>(-1);

  // Fetch high score
  useEffect(() => {
    if (session) {
      const controller = new AbortController();
      fetch('/api/minigames/score?gameType=whack-a-mole', { signal: controller.signal })
        .then(res => res.json())
        .then(data => setHighScore(data.highScore || 0))
        .catch((error) => {
          if (error.name !== 'AbortError') console.error('Failed to fetch high score:', error);
        });
      return () => controller.abort();
    }
  }, [session]);

  const getDifficultySettings = () => {
    switch (difficulty) {
      case 'easy': return { moleInterval: 1200, moleStayTime: 1500, goldenChance: 0.15, bombChance: 0.05 };
      case 'hard': return { moleInterval: 600, moleStayTime: 700, goldenChance: 0.1, bombChance: 0.15 };
      default: return { moleInterval: 900, moleStayTime: 1000, goldenChance: 0.12, bombChance: 0.1 };
    }
  };

  const startGame = () => {
    setScore(0);
    setLives(3);
    setTimeLeft(60);
    setCombo(0);
    setMoles(Array(9).fill(null).map((_, i) => ({ id: i, active: false, isGolden: false, isBomb: false })));
    setGameState('playing');
    lastMoleRef.current = -1;
  };

  // Game timer
  useEffect(() => {
    if (gameState !== 'playing') return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGameState('gameover');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState]);

  // Mole spawner
  useEffect(() => {
    if (gameState !== 'playing') return;

    const settings = getDifficultySettings();

    const spawnMole = () => {
      // Pick random hole, avoiding same hole twice
      let holeId;
      do {
        holeId = Math.floor(Math.random() * 9);
      } while (holeId === lastMoleRef.current && Math.random() > 0.3);

      lastMoleRef.current = holeId;

      const isGolden = Math.random() < settings.goldenChance;
      const isBomb = !isGolden && Math.random() < settings.bombChance;

      setMoles(prev => prev.map(mole =>
        mole.id === holeId
          ? { ...mole, active: true, isGolden, isBomb }
          : mole
      ));

      // Hide mole after stay time
      setTimeout(() => {
        setMoles(prev => prev.map(mole =>
          mole.id === holeId ? { ...mole, active: false } : mole
        ));
        // Missed a mole (not bomb) = lose combo
        setCombo(0);
      }, settings.moleStayTime);
    };

    // Speed up over time
    const speedMultiplier = Math.max(0.5, 1 - (60 - timeLeft) * 0.01);
    const interval = settings.moleInterval * speedMultiplier;

    moleTimerRef.current = setInterval(spawnMole, interval);

    return () => {
      if (moleTimerRef.current) clearInterval(moleTimerRef.current);
    };
  }, [gameState, difficulty, timeLeft]);

  // Whack handler
  const whackMole = (id: number) => {
    if (gameState !== 'playing') return;

    const mole = moles.find(m => m.id === id);
    if (!mole || !mole.active) {
      // Missed - small penalty
      setCombo(0);
      return;
    }

    // Show hit effect
    setShowHit(id);
    setTimeout(() => setShowHit(null), 200);

    if (mole.isBomb) {
      // Hit a bomb!
      setLives(prev => {
        const newLives = prev - 1;
        if (newLives <= 0) {
          setGameState('gameover');
        }
        return newLives;
      });
      setCombo(0);
    } else {
      // Score!
      const basePoints = mole.isGolden ? 50 : 10;
      const comboBonus = Math.floor(combo / 3) * 5;
      setScore(prev => prev + basePoints + comboBonus);
      setCombo(prev => prev + 1);
    }

    // Hide the mole
    setMoles(prev => prev.map(m =>
      m.id === id ? { ...m, active: false } : m
    ));
  };

  // Save score
  useEffect(() => {
    if (gameState === 'gameover' && session && score > highScore) {
      const controller = new AbortController();
      fetch('/api/minigames/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameType: 'whack-a-mole', score }),
        signal: controller.signal
      })
      .then(() => setHighScore(score))
      .catch((error) => {
        if (error.name !== 'AbortError') console.error('Failed to save high score:', error);
      });
      return () => controller.abort();
    }
  }, [gameState, score, highScore, session]);

  return (
    <GameBoyContainer isPlaying={gameState === 'playing'} gameOver={gameState === 'gameover'}>
      <div className="w-full h-full flex flex-col bg-gradient-to-b from-green-800 to-green-900">

        {/* Header */}
        <div className="flex items-center justify-between p-2 bg-amber-900/80 border-b-4 border-amber-950">
          <div className="text-xs font-bold text-amber-200">
            ⏱️ {timeLeft}s
          </div>
          <div className="text-xs font-bold text-yellow-400">
            SCORE: {score}
            {combo >= 3 && (
              <span className="ml-2 text-orange-400 animate-pulse">x{Math.floor(combo / 3) + 1}</span>
            )}
          </div>
          <div className="text-xs text-red-400">
            {'❤️'.repeat(lives)}
          </div>
        </div>

        {/* Game grid */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="grid grid-cols-3 gap-3">
            {moles.map(mole => (
              <motion.button
                key={mole.id}
                onClick={() => whackMole(mole.id)}
                whileTap={{ scale: 0.9 }}
                className={`relative w-16 h-16 rounded-full overflow-hidden cursor-pointer select-none ${
                  showHit === mole.id ? 'ring-4 ring-yellow-400' : ''
                }`}
                style={{
                  background: 'radial-gradient(circle at 50% 100%, #3d2817 0%, #1a0f08 100%)',
                  boxShadow: 'inset 0 -8px 16px rgba(0,0,0,0.5), 0 4px 8px rgba(0,0,0,0.3)',
                }}
              >
                {/* Hole */}
                <div className="absolute inset-2 rounded-full bg-black/80" />

                {/* Mole */}
                <AnimatePresence>
                  {mole.active && (
                    <motion.div
                      initial={{ y: 40, scale: 0.5 }}
                      animate={{ y: 0, scale: 1 }}
                      exit={{ y: 40, scale: 0.5 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                      className="absolute inset-0 flex items-center justify-center text-3xl"
                    >
                      {mole.isBomb ? '💣' : mole.isGolden ? '🌟' : '🐹'}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Hit effect */}
                {showHit === mole.id && (
                  <motion.div
                    initial={{ scale: 0.5, opacity: 1 }}
                    animate={{ scale: 1.5, opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center text-2xl"
                  >
                    💥
                  </motion.div>
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
                <motion.div
                  animate={{ rotate: [-5, 5, -5] }}
                  transition={{ repeat: Infinity, duration: 0.5 }}
                  className="text-5xl mb-4"
                >
                  🔨
                </motion.div>
                <h1 className="text-xl font-black text-amber-400 mb-4">WHACK-A-MOLE</h1>

                <div className="flex gap-2 justify-center mb-4">
                  {(['easy', 'normal', 'hard'] as const).map(diff => (
                    <button
                      key={diff}
                      onClick={() => setDifficulty(diff)}
                      className={`px-3 py-1 rounded text-xs font-bold ${
                        difficulty === diff
                          ? 'bg-amber-600 text-white'
                          : 'bg-gray-700 text-gray-300'
                      }`}
                    >
                      {diff.toUpperCase()}
                    </button>
                  ))}
                </div>

                <div className="text-xs text-gray-400 mb-4 space-y-1">
                  <p>🐹 Normal = 10pts | 🌟 Golden = 50pts</p>
                  <p>💣 Bomb = -1 life | Build combos for bonus!</p>
                </div>

                <button
                  onClick={startGame}
                  className="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded"
                >
                  START
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Game over overlay */}
        <AnimatePresence>
          {gameState === 'gameover' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 flex items-center justify-center"
            >
              <div className="text-center">
                <p className="text-red-500 font-black text-xl mb-2">GAME OVER!</p>
                <p className="text-yellow-400 mb-4">Final Score: {score}</p>
                {score > highScore && (
                  <p className="text-green-400 text-sm mb-2">🏆 NEW HIGH SCORE!</p>
                )}
                <button
                  onClick={startGame}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold rounded"
                >
                  PLAY AGAIN
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </GameBoyContainer>
  );
}
