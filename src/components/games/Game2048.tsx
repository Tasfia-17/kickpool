'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { usePokemonTheme } from '@/components/PokemonThemeProvider';
import { useSession } from 'next-auth/react';
import { RefreshCw, Trophy } from 'lucide-react';
import { GameBoyContainer } from './GameBoyContainer';
import { useSwipeControls, Leaderboard, useSoundEffects, SoundToggle, Confetti } from './GameUtils';

const GRID_SIZE = 4;

// Color mapping for numbers - keeping the vibrant color scheme
const TILE_COLORS: Record<number, string> = {
  2: '#e2e8f0',
  4: '#fef08a',
  8: '#bbf7d0',
  16: '#bfdbfe',
  32: '#fbcfe8',
  64: '#fdba74',
  128: '#fca5a5',
  256: '#c4b5fd',
  512: '#a78bfa',
  1024: '#f472b6',
  2048: '#fcd34d',
  4096: '#fbbf24',
  8192: '#f59e0b',
};

const getTileColor = (val: number): string => {
  return TILE_COLORS[val] || '#000000';
};

const getTextColor = (val: number): string => {
  return val <= 4 ? '#000000' : '#ffffff';
};

type Grid = number[][];

export function Game2048() {
  const { currentTheme } = usePokemonTheme();
  const { data: session } = useSession();
  const { soundEnabled, setSoundEnabled, playSound } = useSoundEffects();
  const [grid, setGrid] = useState<Grid>([]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [globalLeader, setGlobalLeader] = useState<{ score: number; username: string } | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const gridRef = useRef<Grid>([]);
  const scoreRef = useRef(0);

  // Detect mobile
  useEffect(() => {
    setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    if (session) {
      fetchHighScore(controller.signal);
    }
    // Initialize game on mount
    startGame();
    return () => controller.abort();
  }, [session]);

  const fetchHighScore = async (signal?: AbortSignal) => {
    try {
      const res = await fetch('/api/minigames/score?gameType=2048&global=true', { signal });
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

  const createGrid = (): Grid => {
    let newGrid: Grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(0));
    newGrid = addRandomTile(newGrid);
    newGrid = addRandomTile(newGrid);
    return newGrid;
  };

  const addRandomTile = (grid: Grid): Grid => {
    const emptyCells: [number, number][] = [];
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (grid[row][col] === 0) {
          emptyCells.push([row, col]);
        }
      }
    }
    if (emptyCells.length > 0) {
      const [row, col] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      const newGrid = grid.map(r => [...r]); // Deep copy
      newGrid[row][col] = Math.random() < 0.9 ? 2 : 4;
      return newGrid;
    }
    return grid;
  };

  const moveLeft = (grid: Grid): { grid: Grid; scoreIncrease: number } => {
    let scoreIncrease = 0;
    const newGrid = grid.map(row => {
      const filtered = row.filter(val => val !== 0);
      const merged: number[] = [];
      let i = 0;
      while (i < filtered.length) {
        if (i < filtered.length - 1 && filtered[i] === filtered[i + 1]) {
          const mergedValue = filtered[i] * 2;
          merged.push(mergedValue);
          scoreIncrease += mergedValue;
          if (mergedValue === 2048) {
            setGameWon(true);
          }
          i += 2; // Skip both merged tiles
        } else {
          merged.push(filtered[i]);
          i++;
        }
      }
      while (merged.length < GRID_SIZE) merged.push(0);
      return merged;
    });
    return { grid: newGrid, scoreIncrease };
  };

  const rotate = (grid: Grid): Grid => {
    return Array(GRID_SIZE).fill(null).map((_, row) =>
      Array(GRID_SIZE).fill(null).map((_, col) => grid[GRID_SIZE - 1 - col][row])
    );
  };

  const move = (grid: Grid, direction: 'left' | 'right' | 'up' | 'down'): { grid: Grid; scoreIncrease: number } => {
    let newGrid = grid.map(row => [...row]);
    
    if (direction === 'right') {
      newGrid = rotate(rotate(newGrid));
    } else if (direction === 'up') {
      newGrid = rotate(rotate(rotate(newGrid)));
    } else if (direction === 'down') {
      newGrid = rotate(newGrid);
    }

    const result = moveLeft(newGrid);
    newGrid = result.grid;

    if (direction === 'right') {
      newGrid = rotate(rotate(newGrid));
    } else if (direction === 'up') {
      newGrid = rotate(newGrid);
    } else if (direction === 'down') {
      newGrid = rotate(rotate(rotate(newGrid)));
    }

    return { grid: newGrid, scoreIncrease: result.scoreIncrease };
  };

  const canMove = (grid: Grid): boolean => {
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (grid[row][col] === 0) return true;
        if (row < GRID_SIZE - 1 && grid[row][col] === grid[row + 1][col]) return true;
        if (col < GRID_SIZE - 1 && grid[row][col] === grid[row][col + 1]) return true;
      }
    }
    return false;
  };

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (gameOver || gridRef.current.length === 0) return;

    const key = e.key;
    let direction: 'left' | 'right' | 'up' | 'down' | null = null;

    if (key === 'ArrowLeft') direction = 'left';
    else if (key === 'ArrowRight') direction = 'right';
    else if (key === 'ArrowUp') direction = 'up';
    else if (key === 'ArrowDown') direction = 'down';

    if (direction) {
      e.preventDefault();
      performMove(direction);
    }
  }, [gameOver, highScore, session]);

  // Extract move logic to shared function
  const performMove = useCallback((direction: 'left' | 'right' | 'up' | 'down') => {
    if (gameOver || gridRef.current.length === 0) return;
    
    const currentGrid = gridRef.current.map(row => [...row]); // Deep copy
    const result = move(currentGrid, direction);
    
    // Check if grid actually changed
    const gridChanged = JSON.stringify(result.grid) !== JSON.stringify(currentGrid);
    
    if (gridChanged) {
      playSound('click');
      const newGrid = addRandomTile(result.grid);
      gridRef.current = newGrid;
      scoreRef.current += result.scoreIncrease;
      
      if (result.scoreIncrease > 0) {
        playSound('score');
      }
      
      setGrid(newGrid);
      setScore(scoreRef.current);
      
      // Check game over
      if (!canMove(newGrid)) {
        setGameOver(true);
        playSound('gameOver');
        if (session && scoreRef.current > highScore) {
          const newHighScore = scoreRef.current;
          setHighScore(newHighScore);
          setShowConfetti(true);
          fetch('/api/minigames/score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameType: '2048', score: newHighScore }),
          }).catch(console.error);
        }
      }
    }
  }, [gameOver, highScore, session, playSound]);

  // Swipe controls for mobile
  useSwipeControls({
    onSwipeUp: () => performMove('up'),
    onSwipeDown: () => performMove('down'),
    onSwipeLeft: () => performMove('left'),
    onSwipeRight: () => performMove('right'),
    minSwipeDistance: 30,
  });

  useEffect(() => {
    gridRef.current = grid;
  }, [grid]);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  const startGame = () => {
    const newGrid = createGrid();
    gridRef.current = newGrid;
    scoreRef.current = 0;
    setGrid(newGrid);
    setScore(0);
    setGameOver(false);
    setGameWon(false);
    setShowConfetti(false);
  };

  const renderTile = (val: number, r: number, c: number, tileId: number) => {
    if (val === 0) return null;
    const bgColor = getTileColor(val);
    const textColor = getTextColor(val);

    return (
      <motion.div
        key={`tile-${r}-${c}-${tileId}`}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="absolute inset-0 m-0.5 rounded flex items-center justify-center shadow-inner border border-[#0f380f]/20"
        style={{ backgroundColor: bgColor }}
      >
        <div 
          className="text-sm font-black font-mono"
          style={{ color: textColor }}
        >
          {val}
        </div>
      </motion.div>
    );
  };

  if (grid.length === 0) {
    return (
      <GameBoyContainer isPlaying={false} gameOver={false}>
        <div className="w-full h-full flex flex-col items-center justify-center text-[#0f380f]">
          <div className="text-center">
            <h2 className="text-xl font-black mb-2">2048</h2>
            <p className="text-xs opacity-70 mb-4">Combine tiles to reach 2048!</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={startGame}
              className="px-6 py-2 border-2 border-[#0f380f] text-[#0f380f] font-bold hover:bg-[#0f380f] hover:text-[#9ca04c] transition-colors"
            >
              START GAME
            </motion.button>
          </div>
        </div>
      </GameBoyContainer>
    );
  }

  return (
    <GameBoyContainer isPlaying={!gameOver && !gameWon} gameOver={gameOver || gameWon}>
      <Confetti show={showConfetti} />
      <Leaderboard gameType="2048" isOpen={showLeaderboard} onClose={() => setShowLeaderboard(false)} />
      
      <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-[#0f380f]">
        {/* Score Header */}
        <div className="flex justify-between w-full items-center text-xs font-mono mb-1">
          <div>
            <div className="opacity-60">SCORE</div>
            <div className="text-base font-black">{score}</div>
          </div>
          <SoundToggle enabled={soundEnabled} onToggle={() => setSoundEnabled(!soundEnabled)} />
          {highScore > 0 && (
            <div>
              <div className="opacity-60">BEST</div>
              <div className="text-base font-black">{highScore}</div>
            </div>
          )}
        </div>
        
        {/* Global Leader */}
        {globalLeader && (
          <div className="flex items-center gap-1 opacity-70 mb-1">
            <span className="text-[10px]">🌍</span>
            <span className="text-[10px]">{globalLeader.score} by {globalLeader.username}</span>
          </div>
        )}

        {/* Game Grid */}
        <div 
          className="w-full max-w-[200px] aspect-square p-1 relative touch-none"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gridTemplateRows: 'repeat(4, 1fr)', gap: '2px' }}
        >
          {/* Background Grid Cells */}
          {Array(16).fill(0).map((_, i) => (
             <div key={i} className="bg-[#0f380f]/20 rounded" />
          ))}

          {/* Active Tiles Overlay */}
          <div className="absolute inset-0 p-1" 
               style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gridTemplateRows: 'repeat(4, 1fr)', gap: '2px' }}>
             {grid.map((row, r) => row.map((val, c) => {
                const tileId = r * GRID_SIZE + c;
                return (
                  <div key={`cell-${r}-${c}`} className="relative w-full h-full">
                     {val !== 0 && renderTile(val, r, c, tileId)}
                  </div>
                );
             }))}
          </div>
        </div>
        
        {(gameOver || gameWon) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-[#9ca04c]/95 backdrop-blur-[2px] rounded"
          >
            <div className="text-center">
              <div className="text-lg font-black mb-2">
                {gameWon ? '🎉 YOU WIN!' : '💀 GAME OVER'}
              </div>
              <div className="text-sm mb-2">Score: {score}</div>
              {score > highScore && <div className="text-xs mb-2 text-green-700 font-bold">🎉 NEW HIGH SCORE!</div>}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={startGame}
                className="px-4 py-2 border-2 border-[#0f380f] text-[#0f380f] font-bold hover:bg-[#0f380f] hover:text-[#9ca04c] transition-colors text-xs"
              >
                <RefreshCw size={12} className="inline mr-1" /> RESTART
              </motion.button>
            </div>
          </motion.div>
        )}
        
        <p className="text-[10px] opacity-70 font-mono text-center mt-1">
          {isMobile ? 'Swipe to move' : 'Use arrow keys'}
        </p>
      </div>
      
      {/* Score Board Outside Game Boy */}
      <div className="flex gap-6 font-mono text-xs font-bold shrink-0 mt-2">
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
      </div>
    </GameBoyContainer>
  );
}
