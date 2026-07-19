'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useAnimation } from 'motion/react';
import { usePokemonTheme } from '@/components/PokemonThemeProvider';
import { useSession } from 'next-auth/react';
import { Zap, Timer, Trophy } from 'lucide-react';
import { GameBoyContainer } from './GameBoyContainer';

// Floating text particle type
type Particle = {
  id: number;
  x: number;
  y: number;
  val: number;
};

export function ClickerGame() {
  const { isDarkMode, currentTheme } = usePokemonTheme();
  const { data: session } = useSession();
  const controls = useAnimation();

  // Game State
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [combo, setCombo] = useState(0);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [highScore, setHighScore] = useState(0);
  const [globalLeader, setGlobalLeader] = useState<{ score: number; username: string } | null>(null);

  // Refs for loop
  const particleId = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    const controller = new AbortController();
    if (session) {
      fetchHighScore(controller.signal);
    }
    return () => controller.abort();
  }, [session]);

  const fetchHighScore = async (signal?: AbortSignal) => {
    try {
      const res = await fetch('/api/minigames/score?gameType=clicker&global=true', { signal });
      if (res.ok) {
        const data = await res.json();
        setHighScore(data.highScore || 0);
        if (data.globalLeader) {
          setGlobalLeader(data.globalLeader);
        }
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      console.error('Failed to fetch high score:', error);
    }
  };

  const startGame = () => {
    setScore(0);
    setTimeLeft(30);
    setCombo(0);
    setParticles([]);
    setIsPlaying(true);
  };

  // Use ref for score to avoid stale closure in endGame
  const scoreRef = useRef(score);
  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  const endGame = useCallback(async () => {
    setIsPlaying(false);
    const currentScore = scoreRef.current;
    if (currentScore > highScore) {
      setHighScore(currentScore);
      try {
        await fetch('/api/minigames/score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameType: 'clicker',
            score: currentScore,
            level: Math.floor(currentScore / 100),
          }),
        });
      } catch (error) {
        console.error('Failed to save score:', error);
      }
    }
  }, [highScore]);

  useEffect(() => {
    if (isPlaying && timeLeft > 0) {
      timerRef.current = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && isPlaying) {
      endGame();
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, timeLeft, endGame]);

  // The "Juice" Function
  const handleClick = (e: React.MouseEvent) => {
    if (!isPlaying) return;

    // 1. Calculate Score based on Combo
    const addedScore = 1 + Math.floor(combo / 10);
    setScore(prev => prev + addedScore);
    setCombo(prev => prev + 1);

    // 2. Add Floating Particle (at click position)
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newParticle = { id: particleId.current++, x, y, val: addedScore };
    setParticles(prev => [...prev, newParticle]);

    // Cleanup particle after animation (1s)
    setTimeout(() => {
      setParticles(prev => prev.filter(p => p.id !== newParticle.id));
    }, 1000);

    // 3. Trigger Shake Animation
    controls.start({
      scale: [1, 0.95, 1.05, 1],
      rotate: [0, -2, 2, 0],
      transition: { duration: 0.1 }
    });
  };

  return (
    <GameBoyContainer isPlaying={isPlaying} gameOver={timeLeft === 0 && !isPlaying}>
      <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-[#0f380f]">
        {!isPlaying ? (
          <div className="text-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={startGame}
              className="px-6 py-3 border-2 border-[#0f380f] text-[#0f380f] font-bold hover:bg-[#0f380f] hover:text-[#9ca04c] transition-colors"
            >
              START TRAINING
            </motion.button>
            {highScore > 0 && (
              <div className="mt-4 text-xs font-bold opacity-80 flex items-center justify-center gap-1">
                <Trophy size={12} /> HIGH: {highScore}
              </div>
            )}
            {globalLeader && (
              <div className="mt-2 flex items-center gap-1 opacity-70">
                <span className="text-[10px]">🌍</span>
                <span className="text-[10px]">{globalLeader.score} by {globalLeader.username}</span>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* HUD */}
            <div className="flex w-full justify-between items-center text-xs font-mono">
              <div className="text-center">
                <div className="opacity-60 mb-0.5">SCORE</div>
                <div className="text-lg font-black">{score}</div>
              </div>

              <div className="flex flex-col items-center">
                <div className={`text-2xl font-black italic transition-all ${combo > 10 ? 'text-yellow-500 scale-110' : 'opacity-20'}`}>
                  x{1 + Math.floor(combo / 10)}
                </div>
                <div className="text-[8px] font-bold">MULT</div>
              </div>

              <div className="text-center">
                <div className="opacity-60 mb-0.5">TIME</div>
                <div className={`text-lg font-black ${timeLeft < 5 ? 'text-red-500 animate-pulse' : ''}`}>
                  {timeLeft}s
                </div>
              </div>
            </div>

            {/* Main Interactive Area */}
            <div className="relative w-full max-w-[200px] aspect-square flex items-center justify-center">
              <motion.div
                animate={controls}
                onPointerDown={handleClick}
                className="w-full h-full cursor-crosshair relative touch-none select-none"
              >
                {/* The "Target" - Punching Bag */}
                <div
                  className="w-full h-full rounded-2xl border-4 border-[#0f380f] bg-red-500 shadow-[inset_-5px_-5px_0px_rgba(0,0,0,0.2)] flex items-center justify-center relative overflow-hidden active:bg-red-600 transition-colors"
                >
                  {/* Face on the bag */}
                  <div className="flex gap-4 opacity-50">
                    <div className="w-2 h-4 bg-[#0f380f] rounded-full" />
                    <div className="w-2 h-4 bg-[#0f380f] rounded-full" />
                  </div>
                  <div className="absolute bottom-6 w-4 h-2 bg-[#0f380f] rounded-full opacity-50" />

                  {/* Click Particles Layer */}
                  <AnimatePresence>
                    {particles.map(p => (
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 1, y: p.y, x: p.x, scale: 0.5 }}
                        animate={{ opacity: 0, y: p.y - 60, scale: 1.5 }}
                        exit={{ opacity: 0 }}
                        className="absolute font-black text-xl text-white pointer-events-none drop-shadow-md z-20"
                        style={{ left: 0, top: 0 }}
                      >
                        +{p.val}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Shadow */}
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-24 h-4 bg-black/20 rounded-[100%] blur-sm" />
              </motion.div>
            </div>

            <p className="text-[10px] opacity-70 font-mono text-center">
              TAP AS FAST AS YOU CAN!
            </p>
          </>
        )}
      </div>

      {/* Score Board Outside Game Boy */}
      <div className="flex gap-6 font-mono text-xs font-bold shrink-0 mt-2">
        <div className="flex flex-col items-center">
          <span className="opacity-50 text-[9px]">SCORE</span>
          <span className="text-base">{score}</span>
        </div>
        {highScore > 0 && (
          <div className="flex flex-col items-center text-yellow-500">
            <span className="opacity-50 text-[9px]">HIGH</span>
            <div className="flex items-center gap-1">
              <Trophy size={12} />
              <span className="text-base">{highScore}</span>
            </div>
          </div>
        )}
      </div>
    </GameBoyContainer>
  );
}
