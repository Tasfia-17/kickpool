'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { usePokemonTheme } from '@/components/PokemonThemeProvider';
import { useSession } from 'next-auth/react';
import { Bomb, Flag, RefreshCw, Trophy } from 'lucide-react';
import { GameBoyContainer } from './GameBoyContainer';

// Types
interface Cell {
  row: number;
  col: number;
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  neighborMines: number;
}

const ROWS = 8;
const COLS = 8;
const MINES = 10;

export function MinesweeperGame() {
  const { currentTheme } = usePokemonTheme();
  const { data: session } = useSession();
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'WON' | 'LOST'>('IDLE');
  const [flagsUsed, setFlagsUsed] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [time, setTime] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    if (session) {
      fetchHighScore(controller.signal);
    }
    return () => controller.abort();
  }, [session]);

  const fetchHighScore = async (signal?: AbortSignal) => {
    try {
      const res = await fetch('/api/minigames/score?gameType=minesweeper', { signal });
      if (res.ok) {
        const data = await res.json();
        setHighScore(data.highScore || 0);
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      console.error('Failed to fetch high score:', error);
    }
  };

  // Timer
  useEffect(() => {
    if (gameState === 'PLAYING') {
      const timer = setInterval(() => {
        setTime(prev => prev + 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gameState]);

  // Initialize Board
  const initGame = () => {
    setTime(0);
    // 1. Create Empty Grid
    const newGrid: Cell[][] = Array(ROWS).fill(null).map((_, r) => 
      Array(COLS).fill(null).map((_, c) => ({
        row: r, col: c, isMine: false, isRevealed: false, isFlagged: false, neighborMines: 0
      }))
    );

    // 2. Plant Mines (Randomly)
    let minesPlaced = 0;
    while (minesPlaced < MINES) {
      const r = Math.floor(Math.random() * ROWS);
      const c = Math.floor(Math.random() * COLS);
      if (!newGrid[r][c].isMine) {
        newGrid[r][c].isMine = true;
        minesPlaced++;
      }
    }

    // 3. Calculate Neighbors
    const directions = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
    for(let r=0; r<ROWS; r++) {
      for(let c=0; c<COLS; c++) {
        if(newGrid[r][c].isMine) continue;
        let count = 0;
        directions.forEach(([dr, dc]) => {
          const nr = r + dr, nc = c + dc;
          if(nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && newGrid[nr][nc].isMine) count++;
        });
        newGrid[r][c].neighborMines = count;
      }
    }

    setGrid(newGrid);
    setGameState('PLAYING');
    setFlagsUsed(0);
  };

  useEffect(() => { initGame(); }, []);

  // Interaction Logic
  const handleCellClick = (r: number, c: number) => {
    if (gameState !== 'PLAYING' || grid[r][c].isFlagged || grid[r][c].isRevealed) return;

    const newGrid = [...grid.map(row => [...row])];
    const cell = newGrid[r][c];

    if (cell.isMine) {
      // GAME OVER SEQUENCE
      cell.isRevealed = true;
      setGrid(newGrid);
      setGameState('LOST');
      // Reveal all mines visually
      setTimeout(() => {
        setGrid(prev => prev.map(row => row.map(cell => 
          cell.isMine ? { ...cell, isRevealed: true } : cell
        )));
      }, 500);
    } else {
      // Reveal Safe Cell (Flood fill if 0)
      revealSafeCells(newGrid, r, c);
      setGrid(newGrid);
      checkWin(newGrid);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, r: number, c: number) => {
    e.preventDefault();
    if (gameState !== 'PLAYING' || grid[r][c].isRevealed) return;

    const newGrid = [...grid.map(row => [...row])];
    newGrid[r][c].isFlagged = !newGrid[r][c].isFlagged;
    setGrid(newGrid);
    setFlagsUsed(prev => newGrid[r][c].isFlagged ? prev + 1 : prev - 1);
  };

  const revealSafeCells = (grid: Cell[][], r: number, c: number) => {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS || grid[r][c].isRevealed || grid[r][c].isFlagged) return;
    
    grid[r][c].isRevealed = true;
    if (grid[r][c].neighborMines === 0) {
      const directions = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
      directions.forEach(([dr, dc]) => revealSafeCells(grid, r + dr, c + dc));
    }
  };

  const checkWin = async (currentGrid: Cell[][]) => {
    const hiddenNonMines = currentGrid.flat().filter(c => !c.isMine && !c.isRevealed).length;
    if (hiddenNonMines === 0) {
      setGameState('WON');
      // Save high score if applicable
      if (session && (!highScore || time < highScore)) {
        try {
          await fetch('/api/minigames/score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameType: 'minesweeper', score: time }),
          });
          setHighScore(time);
        } catch (error) {
          console.error('Failed to save score:', error);
        }
      }
    }
  };

  const isPlaying = gameState === 'PLAYING';
  const gameOver = gameState === 'WON' || gameState === 'LOST';

  return (
    <GameBoyContainer isPlaying={isPlaying} gameOver={gameOver}>
      <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-[#0f380f]">
        {/* Header */}
        <div className="w-full flex justify-between items-center text-xs font-mono mb-1">
          <div className="flex items-center gap-2">
            <Bomb size={12} className="text-red-500" />
            <span>{MINES - flagsUsed}</span>
          </div>
          <div className="flex items-center gap-2">
            <Trophy size={12} className="text-yellow-500" />
            <span>{time}s</span>
          </div>
        </div>

        {/* THE GRID */}
        <div 
          className="grid gap-0.5 p-1"
          style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}
        >
          {grid.map((row, r) => row.map((cell, c) => (
            <motion.button
              key={`${r}-${c}`}
              onContextMenu={(e) => handleContextMenu(e, r, c)}
              onClick={() => handleCellClick(r, c)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className={`
                w-6 h-6 rounded text-[10px] font-black flex items-center justify-center transition-colors
                ${!cell.isRevealed 
                  ? 'bg-[#0f380f]/30 hover:bg-[#0f380f]/50 border border-[#0f380f]/50' 
                  : cell.isMine 
                    ? 'bg-red-900 border border-red-500' 
                    : 'bg-[#0f380f]/20 border border-[#0f380f]/30 text-[#0f380f]'
                }
              `}
            >
              {cell.isFlagged && !cell.isRevealed && <Flag size={8} className="text-yellow-400" />}
              
              {cell.isRevealed && !cell.isMine && cell.neighborMines > 0 && (
                <span className="text-[#0f380f] font-bold">{cell.neighborMines}</span>
              )}

              {cell.isRevealed && cell.isMine && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                  <Bomb size={10} className="text-red-500" />
                </motion.div>
              )}
            </motion.button>
          )))}
        </div>

        {/* Game Over Modal */}
        <AnimatePresence>
          {gameState !== 'PLAYING' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-[#9ca04c]/95 backdrop-blur-[2px] rounded"
            >
              <div className="text-center">
                {gameState === 'WON' && (
                  <div className="text-lg font-black mb-2">🎉 VICTORY!</div>
                )}
                {gameState === 'LOST' && (
                  <div className="text-lg font-black mb-2">💀 GAME OVER</div>
                )}
                {highScore > 0 && (
                  <div className="text-xs font-mono mb-3 opacity-80">BEST: {highScore}s</div>
                )}
                <button 
                  onClick={initGame}
                  className="px-4 py-2 border-2 border-[#0f380f] text-[#0f380f] font-bold hover:bg-[#0f380f] hover:text-[#9ca04c] transition-colors text-xs"
                >
                  <RefreshCw size={12} className="inline mr-1" /> RESTART
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Score Board Outside Game Boy */}
      <div className="flex gap-6 font-mono text-xs font-bold shrink-0 mt-2">
        {highScore > 0 && (
          <div className="flex flex-col items-center text-yellow-500">
            <span className="opacity-50 text-[9px]">BEST</span>
            <div className="flex items-center gap-1">
              <Trophy size={12} />
              <span className="text-base">{highScore}s</span>
            </div>
          </div>
        )}
      </div>
    </GameBoyContainer>
  );
}
