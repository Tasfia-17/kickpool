'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { GameBoyContainer } from './GameBoyContainer';
import { RotateCw } from 'lucide-react';
import { useSwipeControls } from './GameUtils';

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const CELL_SIZE = 14;

type Board = (string | null)[][];

interface Piece {
  shape: number[][];
  color: string;
  x: number;
  y: number;
}

const PIECES = [
  { shape: [[1, 1, 1, 1]], color: '#00f5ff' }, // I
  { shape: [[1, 1], [1, 1]], color: '#ffff00' }, // O
  { shape: [[0, 1, 0], [1, 1, 1]], color: '#a855f7' }, // T
  { shape: [[1, 0], [1, 0], [1, 1]], color: '#ff6b00' }, // L
  { shape: [[0, 1], [0, 1], [1, 1]], color: '#3b82f6' }, // J
  { shape: [[0, 1, 1], [1, 1, 0]], color: '#22c55e' }, // S
  { shape: [[1, 1, 0], [0, 1, 1]], color: '#ef4444' }, // Z
];

export function TetrisGame() {
  const { data: session } = useSession();

  const [board, setBoard] = useState<Board>(() =>
    Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(null))
  );
  const [currentPiece, setCurrentPiece] = useState<Piece | null>(null);
  const [nextPiece, setNextPiece] = useState<Piece | null>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'paused' | 'gameover'>('menu');

  const gameLoopRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const boardRef = useRef(board);
  const pieceRef = useRef(currentPiece);
  const nextPieceRef = useRef(nextPiece);

  // Keep refs in sync
  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  useEffect(() => {
    pieceRef.current = currentPiece;
  }, [currentPiece]);

  useEffect(() => {
    nextPieceRef.current = nextPiece;
  }, [nextPiece]);

  // Fetch high score
  useEffect(() => {
    if (session) {
      const controller = new AbortController();
      fetch('/api/minigames/score?gameType=tetris', { signal: controller.signal })
        .then(res => res.json())
        .then(data => setHighScore(data.highScore || 0))
        .catch((error) => {
          if (error.name !== 'AbortError') console.error('Failed to fetch high score:', error);
        });
      return () => controller.abort();
    }
  }, [session]);

  const createPiece = useCallback((): Piece => {
    const template = PIECES[Math.floor(Math.random() * PIECES.length)];
    return {
      shape: template.shape.map(row => [...row]),
      color: template.color,
      x: Math.floor(BOARD_WIDTH / 2) - Math.floor(template.shape[0].length / 2),
      y: 0,
    };
  }, []);

  const isValidMove = useCallback((piece: Piece, board: Board, dx: number, dy: number): boolean => {
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const newX = piece.x + x + dx;
          const newY = piece.y + y + dy;

          if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) {
            return false;
          }
          if (newY >= 0 && board[newY][newX]) {
            return false;
          }
        }
      }
    }
    return true;
  }, []);

  const rotatePiece = useCallback((piece: Piece): number[][] => {
    const rows = piece.shape.length;
    const cols = piece.shape[0].length;
    const rotated: number[][] = [];

    for (let x = 0; x < cols; x++) {
      rotated.push([]);
      for (let y = rows - 1; y >= 0; y--) {
        rotated[x].push(piece.shape[y][x]);
      }
    }

    return rotated;
  }, []);

  const lockPiece = useCallback((piece: Piece, board: Board): Board => {
    const newBoard = board.map(row => [...row]);

    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x] && piece.y + y >= 0) {
          newBoard[piece.y + y][piece.x + x] = piece.color;
        }
      }
    }

    return newBoard;
  }, []);

  const clearLines = useCallback((board: Board): { board: Board; cleared: number } => {
    const newBoard = board.filter(row => row.some(cell => !cell));
    const cleared = BOARD_HEIGHT - newBoard.length;

    while (newBoard.length < BOARD_HEIGHT) {
      newBoard.unshift(Array(BOARD_WIDTH).fill(null));
    }

    return { board: newBoard, cleared };
  }, []);

  const startGame = () => {
    const emptyBoard = Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(null));
    setBoard(emptyBoard);
    setCurrentPiece(createPiece());
    setNextPiece(createPiece());
    setScore(0);
    setLines(0);
    setLevel(1);
    setGameState('playing');
  };

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const speed = Math.max(100, 800 - (level - 1) * 100);

    const tick = () => {
      const prev = pieceRef.current;
      if (!prev) return;

      if (isValidMove(prev, boardRef.current, 0, 1)) {
        setCurrentPiece({ ...prev, y: prev.y + 1 });
      } else {
        // Lock piece and spawn new one
        const lockedBoard = lockPiece(prev, boardRef.current);
        const { board: clearedBoard, cleared } = clearLines(lockedBoard);

        setBoard(clearedBoard);
        boardRef.current = clearedBoard;

        if (cleared > 0) {
          const points = [0, 100, 300, 500, 800][cleared] * level;
          setScore(s => s + points);
          setLines(l => {
            const newLines = l + cleared;
            setLevel(Math.floor(newLines / 10) + 1);
            return newLines;
          });
        }

        const newPiece = nextPieceRef.current || createPiece();
        const nextNew = createPiece();
        setNextPiece(nextNew);
        nextPieceRef.current = nextNew;

        // Check game over
        if (!isValidMove(newPiece, clearedBoard, 0, 0)) {
          setGameState('gameover');
          setCurrentPiece(null);
          return;
        }

        setCurrentPiece(newPiece);
      }
    };

    gameLoopRef.current = setInterval(tick, speed);
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [gameState, level, createPiece, isValidMove, lockPiece, clearLines]);

  // Keyboard controls
  useEffect(() => {
    if (gameState !== 'playing') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!currentPiece) return;

      if (e.key === 'ArrowLeft' || e.key === 'a') {
        if (isValidMove(currentPiece, board, -1, 0)) {
          setCurrentPiece(p => p ? { ...p, x: p.x - 1 } : null);
        }
      }
      if (e.key === 'ArrowRight' || e.key === 'd') {
        if (isValidMove(currentPiece, board, 1, 0)) {
          setCurrentPiece(p => p ? { ...p, x: p.x + 1 } : null);
        }
      }
      if (e.key === 'ArrowDown' || e.key === 's') {
        if (isValidMove(currentPiece, board, 0, 1)) {
          setCurrentPiece(p => p ? { ...p, y: p.y + 1 } : null);
          setScore(s => s + 1);
        }
      }
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === ' ') {
        const rotated = rotatePiece(currentPiece);
        const rotatedPiece = { ...currentPiece, shape: rotated };

        // Try normal rotation, then wall kicks
        const kicks = [0, -1, 1, -2, 2];
        for (const kick of kicks) {
          if (isValidMove({ ...rotatedPiece, x: rotatedPiece.x + kick }, board, 0, 0)) {
            setCurrentPiece({ ...rotatedPiece, x: rotatedPiece.x + kick });
            break;
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, currentPiece, board, isValidMove, rotatePiece]);

  // Swipe controls
  useSwipeControls({
    onSwipeLeft: () => {
      if (currentPiece && isValidMove(currentPiece, board, -1, 0)) {
        setCurrentPiece(p => p ? { ...p, x: p.x - 1 } : null);
      }
    },
    onSwipeRight: () => {
      if (currentPiece && isValidMove(currentPiece, board, 1, 0)) {
        setCurrentPiece(p => p ? { ...p, x: p.x + 1 } : null);
      }
    },
    onSwipeDown: () => {
      if (currentPiece && isValidMove(currentPiece, board, 0, 1)) {
        setCurrentPiece(p => p ? { ...p, y: p.y + 1 } : null);
      }
    },
    onSwipeUp: () => {
      if (!currentPiece) return;
      const rotated = rotatePiece(currentPiece);
      if (isValidMove({ ...currentPiece, shape: rotated }, board, 0, 0)) {
        setCurrentPiece({ ...currentPiece, shape: rotated });
      }
    },
  });

  // Save score on game over
  useEffect(() => {
    if (gameState === 'gameover' && session && score > highScore) {
      const controller = new AbortController();
      fetch('/api/minigames/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameType: 'tetris', score }),
        signal: controller.signal
      })
      .then(() => setHighScore(score))
      .catch((error) => {
        if (error.name !== 'AbortError') console.error('Failed to save high score:', error);
      });
      return () => controller.abort();
    }
  }, [gameState, score, highScore, session]);

  const moveLeft = () => {
    if (currentPiece && isValidMove(currentPiece, board, -1, 0)) {
      setCurrentPiece(p => p ? { ...p, x: p.x - 1 } : null);
    }
  };

  const moveRight = () => {
    if (currentPiece && isValidMove(currentPiece, board, 1, 0)) {
      setCurrentPiece(p => p ? { ...p, x: p.x + 1 } : null);
    }
  };

  const moveDown = () => {
    if (currentPiece && isValidMove(currentPiece, board, 0, 1)) {
      setCurrentPiece(p => p ? { ...p, y: p.y + 1 } : null);
      setScore(s => s + 1);
    }
  };

  const rotate = () => {
    if (!currentPiece) return;
    const rotated = rotatePiece(currentPiece);
    if (isValidMove({ ...currentPiece, shape: rotated }, board, 0, 0)) {
      setCurrentPiece({ ...currentPiece, shape: rotated });
    }
  };

  const renderBoard = () => {
    const displayBoard = board.map(row => [...row]);

    // Add current piece to display
    if (currentPiece) {
      for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
          if (currentPiece.shape[y][x]) {
            const boardY = currentPiece.y + y;
            const boardX = currentPiece.x + x;
            if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
              displayBoard[boardY][boardX] = currentPiece.color;
            }
          }
        }
      }
    }

    return displayBoard;
  };

  return (
    <GameBoyContainer isPlaying={gameState === 'playing'} gameOver={gameState === 'gameover'}>
      <div className="w-full h-full flex flex-col bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between p-2 bg-black border-b border-gray-700 text-xs">
          <div className="font-mono">
            <span className="text-gray-500">SCORE</span>
            <span className="text-yellow-400 ml-2">{score}</span>
          </div>
          <div className="font-mono">
            <span className="text-gray-500">LV</span>
            <span className="text-cyan-400 ml-1">{level}</span>
          </div>
          <div className="font-mono">
            <span className="text-gray-500">LINES</span>
            <span className="text-green-400 ml-2">{lines}</span>
          </div>
        </div>

        {/* Game area */}
        <div className="flex-1 flex justify-center items-center gap-3 p-2 relative">
          {/* Game board */}
          <div
            className="border-2 border-gray-600 bg-black"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${BOARD_WIDTH}, ${CELL_SIZE}px)`,
              gap: '1px',
              padding: '2px',
            }}
          >
            {renderBoard().map((row, y) =>
              row.map((cell, x) => (
                <div
                  key={`${y}-${x}`}
                  className="transition-colors"
                  style={{
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                    backgroundColor: cell || '#1a1a2e',
                    boxShadow: cell ? `inset 2px 2px 0 rgba(255,255,255,0.3), inset -2px -2px 0 rgba(0,0,0,0.3)` : 'none',
                  }}
                />
              ))
            )}
          </div>

          {/* Next piece preview */}
          <div className="flex flex-col gap-2">
            <div className="text-xs text-gray-500 text-center">NEXT</div>
            <div className="p-2 bg-black border border-gray-700 rounded">
              {nextPiece && (
                <div className="grid gap-px" style={{ gridTemplateColumns: `repeat(${nextPiece.shape[0].length}, 10px)` }}>
                  {nextPiece.shape.map((row, y) =>
                    row.map((cell, x) => (
                      <div
                        key={`${y}-${x}`}
                        style={{
                          width: 10,
                          height: 10,
                          backgroundColor: cell ? nextPiece.color : 'transparent',
                        }}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Menu overlay */}
          {gameState === 'menu' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/90">
              <div className="text-center">
                <h1 className="text-2xl font-black text-cyan-400 mb-4">TETRIS</h1>
                <p className="text-xs text-gray-500 mb-4">Arrow keys or swipe to play</p>
                <button
                  onClick={startGame}
                  className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded"
                >
                  START
                </button>
              </div>
            </div>
          )}

          {/* Game over overlay */}
          {gameState === 'gameover' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/90">
              <div className="text-center">
                <p className="text-red-500 font-black text-xl mb-2">GAME OVER</p>
                <p className="text-yellow-400 mb-1">Score: {score}</p>
                <p className="text-gray-500 text-xs mb-4">Lines: {lines} | Level: {level}</p>
                {score > highScore && <p className="text-green-400 text-sm mb-2">NEW HIGH SCORE!</p>}
                <button
                  onClick={startGame}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold rounded"
                >
                  PLAY AGAIN
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Mobile controls */}
        <div className="p-2 bg-black border-t border-gray-700">
          <div className="flex justify-between items-center gap-2">
            <button type="button" onClick={moveLeft} className="px-4 py-3 bg-gray-700 rounded font-bold text-xs active:bg-gray-600">◀</button>
            <button type="button" onClick={rotate} className="px-4 py-3 bg-purple-600 rounded font-bold text-xs active:bg-purple-500">
              <RotateCw size={16} />
            </button>
            <button type="button" onClick={moveDown} className="px-4 py-3 bg-gray-700 rounded font-bold text-xs active:bg-gray-600">▼</button>
            <button type="button" onClick={moveRight} className="px-4 py-3 bg-gray-700 rounded font-bold text-xs active:bg-gray-600">▶</button>
          </div>
        </div>
      </div>
    </GameBoyContainer>
  );
}
