'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { usePokemonTheme } from '@/components/PokemonThemeProvider';
import { GameBoyContainer } from './GameBoyContainer';

type Player = 'X' | 'O' | null;
type Board = Player[];

export function TicTacToeGame() {
  usePokemonTheme(); // Theme context
  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState<Player>('X');
  const [winner, setWinner] = useState<Player | 'TIE' | null>(null);
  const [scores, setScores] = useState({ X: 0, O: 0, ties: 0 });
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);

  const checkWinner = (board: Board): Player | 'TIE' | null => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
      [0, 4, 8], [2, 4, 6], // diagonals
    ];

    for (const line of lines) {
      const [a, b, c] = line;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a] as Player;
      }
    }

    if (board.every(cell => cell !== null)) {
      return 'TIE';
    }

    return null;
  };

  const getBestMove = (board: Board, player: Player): number => {
    const opponent = player === 'X' ? 'O' : 'X';

    // Try to win
    for (let i = 0; i < 9; i++) {
      if (board[i] === null) {
        const testBoard = [...board];
        testBoard[i] = player;
        if (checkWinner(testBoard) === player) {
          return i;
        }
      }
    }

    // Block opponent
    for (let i = 0; i < 9; i++) {
      if (board[i] === null) {
        const testBoard = [...board];
        testBoard[i] = opponent;
        if (checkWinner(testBoard) === opponent) {
          return i;
        }
      }
    }

    // Take center
    if (board[4] === null) return 4;

    // Take corners
    const corners = [0, 2, 6, 8];
    const availableCorners = corners.filter(i => board[i] === null);
    if (availableCorners.length > 0) {
      return availableCorners[Math.floor(Math.random() * availableCorners.length)];
    }

    // Random
    const available = board.map((cell, idx) => cell === null ? idx : -1).filter(idx => idx !== -1);
    return available[Math.floor(Math.random() * available.length)];
  };

  const handleCellClick = (index: number) => {
    if (board[index] || winner || !isPlayerTurn) return;

    const newBoard = [...board];
    newBoard[index] = currentPlayer;
    setBoard(newBoard);
    setIsPlayerTurn(false);

    const gameWinner = checkWinner(newBoard);
    if (gameWinner) {
      setWinner(gameWinner);
      if (gameWinner === 'X') {
        setScores(prev => ({ ...prev, X: prev.X + 1 }));
      } else if (gameWinner === 'TIE') {
        setScores(prev => ({ ...prev, ties: prev.ties + 1 }));
      }
    } else {
      setCurrentPlayer(prev => prev === 'X' ? 'O' : 'X');
    }
  };

  useEffect(() => {
    if (!isPlayerTurn && !winner && currentPlayer === 'O') {
      setTimeout(() => {
        const aiMove = getBestMove(board, 'O');
        const newBoard = [...board];
        newBoard[aiMove] = 'O';
        setBoard(newBoard);
        setIsPlayerTurn(true);

        const gameWinner = checkWinner(newBoard);
        if (gameWinner) {
          setWinner(gameWinner);
          if (gameWinner === 'O') {
            setScores(prev => ({ ...prev, O: prev.O + 1 }));
          } else if (gameWinner === 'TIE') {
            setScores(prev => ({ ...prev, ties: prev.ties + 1 }));
          }
        } else {
          setCurrentPlayer('X');
        }
      }, 500);
    }
  }, [isPlayerTurn, currentPlayer, winner, board]);

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setCurrentPlayer('X');
    setWinner(null);
    setIsPlayerTurn(true);
  };

  const isPlaying = !winner && board.some(cell => cell !== null);
  const gameOver = winner !== null;

  return (
    <GameBoyContainer isPlaying={isPlaying} gameOver={gameOver}>
      <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-[#0f380f]">
        {/* Score Header */}
        <div className="flex justify-between w-full items-center text-xs font-mono mb-1">
          <div className="text-center">
            <div className="opacity-60">X</div>
            <div className="text-base font-black">{scores.X}</div>
          </div>
          <div className="text-center">
            <div className="opacity-60">TIES</div>
            <div className="text-base font-black">{scores.ties}</div>
          </div>
          <div className="text-center">
            <div className="opacity-60">O</div>
            <div className="text-base font-black">{scores.O}</div>
          </div>
        </div>

        {/* Game Grid */}
        <div className="grid grid-cols-3 gap-1 p-2 bg-[#0f380f]/20 rounded">
          {board.map((cell, index) => (
            <motion.button
              key={index}
              onClick={() => handleCellClick(index)}
              disabled={!!cell || !!winner || !isPlayerTurn}
              whileHover={{ scale: cell ? 1 : 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`
                w-12 h-12 flex items-center justify-center text-2xl font-black rounded
                ${cell === 'X'
                  ? 'bg-blue-500 text-white'
                  : cell === 'O'
                    ? 'bg-red-500 text-white'
                    : 'bg-[#0f380f]/30 hover:bg-[#0f380f]/50 border border-[#0f380f]/50'
                }
                ${!cell && !winner && isPlayerTurn ? 'cursor-pointer' : 'cursor-not-allowed'}
              `}
            >
              {cell}
            </motion.button>
          ))}
        </div>

        {/* Winner Display */}
        {winner && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="text-sm font-black mb-2">
              {winner === 'TIE' ? 'TIE GAME!' : `${winner} WINS!`}
            </div>
            <button
              onClick={resetGame}
              className="px-4 py-1.5 border-2 border-[#0f380f] text-[#0f380f] font-bold hover:bg-[#0f380f] hover:text-[#9ca04c] transition-colors text-xs"
            >
              PLAY AGAIN
            </button>
          </motion.div>
        )}

        {!winner && (
          <p className="text-[10px] opacity-70 font-mono text-center">
            {isPlayerTurn ? 'Your turn (X)' : 'AI thinking...'}
          </p>
        )}
      </div>
    </GameBoyContainer>
  );
}
