'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePokemonTheme } from '@/components/PokemonThemeProvider';
import { useSession } from 'next-auth/react';
import { Trophy, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSwipeControls, Leaderboard, useSoundEffects, SoundToggle, DifficultySelector, DIFFICULTIES, Confetti } from './GameUtils';

// Game Constants
const GRID_SIZE = 20;
const TILE_SIZE = 20; // Pixels per grid cell
const CANVAS_SIZE = GRID_SIZE * TILE_SIZE;

// Speed based on difficulty
const SPEEDS = {
  easy: 150,
  medium: 100,
  hard: 60,
};

type Difficulty = 'easy' | 'medium' | 'hard';

export function SnakeGame() {
  usePokemonTheme(); // Theme context
  const { data: session } = useSession();
  const { soundEnabled, setSoundEnabled, playSound } = useSoundEffects();

  // Game State
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [globalLeader, setGlobalLeader] = useState<{ score: number; username: string } | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Mutable Game Logic (Refs are faster than State for game loops)
  const snake = useRef([{ x: 10, y: 10 }]);
  const food = useRef({ x: 15, y: 5 });
  const direction = useRef({ x: 1, y: 0 }); // Moving right
  const nextDirection = useRef({ x: 1, y: 0 }); // Input buffer
  const gameLoop = useRef<NodeJS.Timeout | undefined>(undefined);

  // Detect mobile
  useEffect(() => {
    setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  // Fetch high score and global leader
  useEffect(() => {
    if (session) {
      const controller = new AbortController();
      fetch('/api/minigames/score?gameType=snake&global=true', { signal: controller.signal })
        .then(res => res.json())
        .then(data => {
          setHighScore(data.highScore || 0);
          if (data.globalLeader) {
            setGlobalLeader(data.globalLeader);
          }
        })
        .catch((error) => {
          if (error.name !== 'AbortError') console.error('Failed to fetch high score:', error);
        });
      return () => controller.abort();
    }
  }, [session]);

  // Direction change handler
  const changeDirection = useCallback((dir: 'up' | 'down' | 'left' | 'right') => {
    if (!isPlaying || gameOver) return;

    const currentDir = direction.current;
    switch (dir) {
      case 'up':
        if (currentDir.y === 0) nextDirection.current = { x: 0, y: -1 };
        break;
      case 'down':
        if (currentDir.y === 0) nextDirection.current = { x: 0, y: 1 };
        break;
      case 'left':
        if (currentDir.x === 0) nextDirection.current = { x: -1, y: 0 };
        break;
      case 'right':
        if (currentDir.x === 0) nextDirection.current = { x: 1, y: 0 };
        break;
    }
  }, [isPlaying, gameOver]);

  // Swipe controls for mobile
  useSwipeControls({
    onSwipeUp: () => changeDirection('up'),
    onSwipeDown: () => changeDirection('down'),
    onSwipeLeft: () => changeDirection('left'),
    onSwipeRight: () => changeDirection('right'),
    minSwipeDistance: 30,
  });

  // --- KEYBOARD CONTROLS ---
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Prevent scrolling when playing
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }

      switch (e.key) {
        case 'ArrowUp': changeDirection('up'); break;
        case 'ArrowDown': changeDirection('down'); break;
        case 'ArrowLeft': changeDirection('left'); break;
        case 'ArrowRight': changeDirection('right'); break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [changeDirection]);

  // --- RENDER LOOP ---
  const drawGame = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    // 1. Clear Canvas
    ctx.fillStyle = '#9ca04c'; // Gameboy Green
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // 2. Draw Grid (Subtle)
    ctx.strokeStyle = '#8b914d';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * TILE_SIZE, 0);
      ctx.lineTo(i * TILE_SIZE, CANVAS_SIZE);
      ctx.moveTo(0, i * TILE_SIZE);
      ctx.lineTo(CANVAS_SIZE, i * TILE_SIZE);
      ctx.stroke();
    }

    // 3. Draw Snake with gradient effect
    snake.current.forEach((segment, i) => {
      // Gradient from head to tail
      const brightness = Math.max(0.3, 1 - (i / snake.current.length) * 0.5);
      ctx.fillStyle = `rgba(15, 56, 15, ${brightness})`;
      ctx.fillRect(
        segment.x * TILE_SIZE + 1,
        segment.y * TILE_SIZE + 1,
        TILE_SIZE - 2,
        TILE_SIZE - 2
      );

      // Draw eyes on head
      if (i === 0) {
        ctx.fillStyle = '#9ca04c';
        const eyeSize = 3;
        const eyeOffset = 4;
        // Eyes based on direction
        if (direction.current.x === 1) { // Right
          ctx.fillRect(segment.x * TILE_SIZE + TILE_SIZE - eyeOffset, segment.y * TILE_SIZE + 4, eyeSize, eyeSize);
          ctx.fillRect(segment.x * TILE_SIZE + TILE_SIZE - eyeOffset, segment.y * TILE_SIZE + TILE_SIZE - 7, eyeSize, eyeSize);
        } else if (direction.current.x === -1) { // Left
          ctx.fillRect(segment.x * TILE_SIZE + eyeOffset - eyeSize, segment.y * TILE_SIZE + 4, eyeSize, eyeSize);
          ctx.fillRect(segment.x * TILE_SIZE + eyeOffset - eyeSize, segment.y * TILE_SIZE + TILE_SIZE - 7, eyeSize, eyeSize);
        } else if (direction.current.y === -1) { // Up
          ctx.fillRect(segment.x * TILE_SIZE + 4, segment.y * TILE_SIZE + eyeOffset - eyeSize, eyeSize, eyeSize);
          ctx.fillRect(segment.x * TILE_SIZE + TILE_SIZE - 7, segment.y * TILE_SIZE + eyeOffset - eyeSize, eyeSize, eyeSize);
        } else { // Down
          ctx.fillRect(segment.x * TILE_SIZE + 4, segment.y * TILE_SIZE + TILE_SIZE - eyeOffset, eyeSize, eyeSize);
          ctx.fillRect(segment.x * TILE_SIZE + TILE_SIZE - 7, segment.y * TILE_SIZE + TILE_SIZE - eyeOffset, eyeSize, eyeSize);
        }
      }
    });

    // 4. Draw Food (apple-like)
    ctx.fillStyle = '#FF4444';
    const f = food.current;
    ctx.beginPath();
    ctx.arc(
      f.x * TILE_SIZE + TILE_SIZE / 2,
      f.y * TILE_SIZE + TILE_SIZE / 2,
      TILE_SIZE / 3,
      0,
      Math.PI * 2
    );
    ctx.fill();
    // Stem
    ctx.fillStyle = '#0f380f';
    ctx.fillRect(f.x * TILE_SIZE + TILE_SIZE / 2 - 1, f.y * TILE_SIZE + 3, 2, 4);
  }, []);

  // --- GAME LOOP ---
  const tick = useCallback(() => {
    // Update direction from buffer
    direction.current = nextDirection.current;

    const head = { ...snake.current[0] };
    head.x += direction.current.x;
    head.y += direction.current.y;

    // Collision Check (Walls or Self)
    if (
      head.x < 0 || head.x >= GRID_SIZE ||
      head.y < 0 || head.y >= GRID_SIZE ||
      snake.current.some(s => s.x === head.x && s.y === head.y)
    ) {
      setGameOver(true);
      setIsPlaying(false);
      playSound('gameOver');
      if (gameLoop.current) clearInterval(gameLoop.current);

      // Save high score - use current score state (already updated)
      setScore(currentScore => {
        if (currentScore > highScore && session) {
          setShowConfetti(true);
          fetch('/api/minigames/score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameType: 'snake', score: currentScore }),
          }).then(() => setHighScore(currentScore));
        }
        return currentScore;
      });
      return;
    }

    const newSnake = [head, ...snake.current];

    // Eat Food
    if (head.x === food.current.x && head.y === food.current.y) {
      const points = 10 * DIFFICULTIES[difficulty].multiplier;
      setScore(s => s + Math.floor(points));
      playSound('score');

      // Spawn new food not on snake
      let newFood: { x: number; y: number };
      do {
        newFood = {
          x: Math.floor(Math.random() * GRID_SIZE),
          y: Math.floor(Math.random() * GRID_SIZE)
        };
      } while (newSnake.some(s => s.x === newFood.x && s.y === newFood.y));
      food.current = newFood;
    } else {
      newSnake.pop(); // Move tail
    }

    snake.current = newSnake;
    drawGame();
  }, [drawGame, highScore, session, playSound, difficulty]);

  // Initial Draw
  useEffect(() => {
    drawGame();
  }, [drawGame]);

  // Game Loop Management
  useEffect(() => {
    if (isPlaying && !gameOver) {
      gameLoop.current = setInterval(tick, SPEEDS[difficulty]);
      return () => {
        if (gameLoop.current) clearInterval(gameLoop.current);
      };
    }
  }, [isPlaying, gameOver, tick, difficulty]);

  const startGame = () => {
    setScore(0);
    setGameOver(false);
    setIsPlaying(true);
    setShowConfetti(false);
    snake.current = [{ x: 10, y: 10 }];
    food.current = { x: 15, y: 5 };
    direction.current = { x: 1, y: 0 };
    nextDirection.current = { x: 1, y: 0 };
  };

  return (
    <div className="flex flex-col items-center gap-2 w-full h-full justify-center p-2 overflow-hidden">
      <Confetti show={showConfetti} />
      <Leaderboard gameType="snake" isOpen={showLeaderboard} onClose={() => setShowLeaderboard(false)} />

      {/* Game Console Shell - Compact */}
      <div className="relative bg-gray-300 rounded-lg shadow-xl border-b-4 border-r-4 border-gray-400 w-full max-w-[320px] flex flex-col">
        <div className="flex flex-col p-3 min-h-0">

          {/* Screen Bezel */}
          <div className="bg-gray-700 p-3 rounded-lg rounded-br-[20px] shadow-inner relative flex flex-col">

              {/* Power LED & Sound Toggle */}
              <div className="absolute top-1 left-1 flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${isPlaying && !gameOver ? 'bg-red-500 shadow-[0_0_5px_red]' : 'bg-red-900'}`} />
                <SoundToggle enabled={soundEnabled} onToggle={() => setSoundEnabled(!soundEnabled)} />
              </div>
              <div className="absolute top-1 right-8 text-[8px] text-gray-400 font-mono tracking-widest">BATTERY</div>

              {/* The Canvas Display - Compact */}
              <div className="flex items-center justify-center relative">
                <canvas
                  ref={canvasRef}
                  width={CANVAS_SIZE}
                  height={CANVAS_SIZE}
                  className="bg-[#9ca04c] border-2 border-[#8b914d] shadow-[inset_0_0_20px_rgba(0,0,0,0.2)] w-full max-w-[280px] aspect-square"
                  style={{ imageRendering: 'pixelated' }}
                />

                {/* Scanlines Overlay */}
                <div className="absolute inset-0 pointer-events-none z-20 opacity-10 rounded"
                     style={{
                       background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 255, 0, 0.06))',
                       backgroundSize: '100% 2px, 3px 100%'
                     }}
                />

                {/* UI Overlay for Game Over / Start */}
                {(!isPlaying || gameOver) && (
                  <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#9ca04c]/90 backdrop-blur-[2px] rounded">
                    <div className="text-center text-[#0f380f] p-3">
                      {gameOver ? (
                        <>
                          <div className="text-lg font-black mb-1">GAME OVER</div>
                          <div className="text-sm mb-2">Score: {score}</div>
                          {score > highScore && <div className="text-xs mb-2 text-green-700 font-bold">🎉 NEW HIGH SCORE!</div>}
                          {highScore > 0 && score <= highScore && (
                            <div className="text-xs mb-2">High: {highScore}</div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="text-sm font-black mb-2 animate-pulse">
                            {isMobile ? 'SWIPE TO MOVE' : 'PRESS ARROW KEY'}
                          </div>
                          <DifficultySelector
                            difficulty={difficulty}
                            onChange={setDifficulty}
                            disabled={isPlaying}
                          />
                        </>
                      )}

                      <button
                        onClick={startGame}
                        className="mt-3 px-3 py-1.5 text-xs border-2 border-[#0f380f] text-[#0f380f] font-bold hover:bg-[#0f380f] hover:text-[#9ca04c] transition-colors"
                      >
                        {gameOver ? 'TRY AGAIN' : 'START GAME'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-1 text-center text-gray-400 font-mono text-[7px] italic">
                 CINEPURR GAMEBOY TM
              </div>
          </div>

          {/* Mobile Controls or Decoration */}
          {isMobile && isPlaying && !gameOver ? (
            <div className="mt-3 grid grid-cols-3 gap-1 w-fit mx-auto">
              <div />
              <button
                className="w-10 h-10 rounded-lg bg-gray-700 active:bg-gray-600 flex items-center justify-center touch-manipulation"
                onTouchStart={(e) => { e.preventDefault(); changeDirection('up'); }}
              >
                <ChevronUp size={20} className="text-white" />
              </button>
              <div />
              <button
                className="w-10 h-10 rounded-lg bg-gray-700 active:bg-gray-600 flex items-center justify-center touch-manipulation"
                onTouchStart={(e) => { e.preventDefault(); changeDirection('left'); }}
              >
                <ChevronLeft size={20} className="text-white" />
              </button>
              <div className="w-10 h-10 rounded-full bg-gray-800 border-2 border-gray-600" />
              <button
                className="w-10 h-10 rounded-lg bg-gray-700 active:bg-gray-600 flex items-center justify-center touch-manipulation"
                onTouchStart={(e) => { e.preventDefault(); changeDirection('right'); }}
              >
                <ChevronRight size={20} className="text-white" />
              </button>
              <div />
              <button
                className="w-10 h-10 rounded-lg bg-gray-700 active:bg-gray-600 flex items-center justify-center touch-manipulation"
                onTouchStart={(e) => { e.preventDefault(); changeDirection('down'); }}
              >
                <ChevronDown size={20} className="text-white" />
              </button>
              <div />
            </div>
          ) : (
            /* Controls Decoration - Compact */
            <div className="mt-3 flex justify-between items-center px-4 shrink-0">
               <div className="w-16 h-16 relative">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-full bg-gray-700 rounded shadow-md" />
                  <div className="absolute top-1/2 left-0 -translate-y-1/2 w-full h-3 bg-gray-700 rounded shadow-md" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-gray-600 rounded-full inset-shadow" />
               </div>

               <div className="flex gap-3 rotate-[-25deg] translate-y-2">
                  <div className="flex flex-col items-center gap-0.5">
                     <div className="w-6 h-6 rounded-full bg-red-700 shadow-[0_2px_0_#550000]" />
                     <span className="font-bold text-gray-500 text-[9px]">B</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5 mt-3">
                     <div className="w-6 h-6 rounded-full bg-red-700 shadow-[0_2px_0_#550000]" />
                     <span className="font-bold text-gray-500 text-[9px]">A</span>
                  </div>
               </div>
            </div>
          )}

        </div>
      </div>

      {/* Score Board - Compact */}
      <div className="flex gap-4 font-mono text-xs font-bold shrink-0 items-center">
        <div className="flex flex-col items-center">
          <span className="opacity-50 text-[9px]">SCORE</span>
          <span className="text-base">{score}</span>
        </div>
        <button
          onClick={() => setShowLeaderboard(true)}
          className="flex flex-col items-center text-yellow-500 hover:scale-105 transition-transform"
        >
          <span className="opacity-50 text-[9px]">HIGH</span>
          <div className="flex items-center gap-1">
            <Trophy size={12} />
            <span className="text-base">{Math.max(score, highScore)}</span>
          </div>
        </button>
        <div className="flex flex-col items-center">
          <span className="opacity-50 text-[9px]">DIFF</span>
          <span className="text-[10px]" style={{ color: DIFFICULTIES[difficulty].color }}>
            {DIFFICULTIES[difficulty].label}
          </span>
        </div>
        {globalLeader && (
          <div className="flex flex-col items-center border-l border-gray-300 pl-4">
            <span className="opacity-50 text-[9px]">🏆 WORLD</span>
            <span className="text-[10px]">{globalLeader.score} by {globalLeader.username}</span>
          </div>
        )}
      </div>
    </div>
  );
}
