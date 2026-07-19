'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSession } from 'next-auth/react';
import { io, Socket } from 'socket.io-client';
import { Wifi, Copy, RefreshCw } from 'lucide-react';
import { GameBoyContainer } from './GameBoyContainer';

type Player = 1 | 2 | null;
type Board = Player[][];

const ROWS = 6;
const COLS = 7;

export function MultiplayerConnectFour() {
  const { data: session } = useSession();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [board, setBoard] = useState<Board>(createEmptyBoard());
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1);
  const [myPlayer, setMyPlayer] = useState<1 | 2 | null>(null);
  const [winner, setWinner] = useState<1 | 2 | 'TIE' | null>(null);
  const [winningCells, setWinningCells] = useState<[number, number][]>([]);
  const [gameId, setGameId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Array<{ id: string; name: string }>>([]);
  const [isHost, setIsHost] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [status, setStatus] = useState<'LOBBY' | 'PLAYING' | 'WIN' | 'DRAW'>('LOBBY');
  const [hoverCol, setHoverCol] = useState<number | null>(null);

  function createEmptyBoard(): Board {
    return Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
  }

  useEffect(() => {
    if (!session) return;

    const computeSocketUrl = () => {
      if (typeof window === 'undefined') return 'http://localhost:4000';
      try {
        const { protocol, hostname, port } = window.location;
        if (hostname.includes('-3000.')) {
          return `${protocol}//${hostname.replace('-3000.', '-4000.')}`;
        }
        if (port) {
          return `${protocol}//${hostname}:4000`;
        }
        return `${protocol}//${hostname}:4000`;
      } catch {
        return 'http://localhost:4000';
      }
    };

    const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || computeSocketUrl());
    setSocket(newSocket);

    newSocket.on('game:created', ({ gameId, players: initialPlayers }: { gameId: string; players?: Array<{ id: string; name: string }> }) => {
      console.log('[ConnectFour] game:created received:', { gameId, initialPlayers });
      setGameId(gameId);
      setInviteCode(gameId);
      setIsHost(true);
      setMyPlayer(1);
      setCurrentPlayer(1);
      setStatus('LOBBY');
      // Set initial players if provided (host should see themselves)
      if (initialPlayers && initialPlayers.length > 0) {
        console.log('[ConnectFour] Setting initial players:', initialPlayers);
        setPlayers(initialPlayers);
      }
    });

    newSocket.on('game:player_joined', ({ players: newPlayers }: { players: Array<{ id: string; name: string }> }) => {
      console.log('[ConnectFour] game:player_joined received:', newPlayers);
      setPlayers(newPlayers);
      if (newPlayers.length === 2) {
        setStatus('PLAYING');
        if (!myPlayer) {
          const userId = (session.user as any)?.id || session.user?.name || session.user?.email;
          const isFirstPlayer = newPlayers[0].id === userId;
          setMyPlayer(isFirstPlayer ? 1 : 2);
          setCurrentPlayer(1);
        }
      }
    });

    newSocket.on('game:move_received', ({ move, from }: { move: any; from: { id: string; name: string } }) => {
      const userId = (session.user as any)?.id || session.user?.name || session.user?.email;
      if (from.id !== userId) {
        setBoard(move.board);
        setCurrentPlayer(move.currentPlayer);
        if (move.winner) {
          setWinner(move.winner);
          setWinningCells(move.winningCells || []);
          setStatus(move.winner === 'TIE' ? 'DRAW' : 'WIN');
        }
      }
    });

    newSocket.on('game:error', ({ message }: { message: string }) => {
      console.error('[ConnectFour] Game error:', message);
      alert(message);
    });

    newSocket.on('game:player_left', ({ players: newPlayers }: { players: Array<{ id: string; name: string }> }) => {
      console.log('[ConnectFour] game:player_left received:', newPlayers);
      setPlayers(newPlayers);
      if (newPlayers.length < 2 && status === 'PLAYING') {
        setStatus('LOBBY');
      }
    });

    return () => {
      if (gameId && session) {
        const userId = (session.user as any)?.id || session.user?.name || session.user?.email;
        const userName = session.user?.name || 'Guest';
        newSocket.emit('game:leave', { gameId, user: { id: userId, name: userName } });
      }
      newSocket.close();
    };
  }, [session, myPlayer, gameId]);

  const checkWinner = (board: Board): { winner: 1 | 2 | 'TIE' | null; cells: [number, number][] } => {
    // Check horizontal
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col <= COLS - 4; col++) {
        const cell = board[row][col];
        if (cell && cell === board[row][col + 1] && cell === board[row][col + 2] && cell === board[row][col + 3]) {
          return { winner: cell, cells: [[row, col], [row, col + 1], [row, col + 2], [row, col + 3]] };
        }
      }
    }

    // Check vertical
    for (let row = 0; row <= ROWS - 4; row++) {
      for (let col = 0; col < COLS; col++) {
        const cell = board[row][col];
        if (cell && cell === board[row + 1][col] && cell === board[row + 2][col] && cell === board[row + 3][col]) {
          return { winner: cell, cells: [[row, col], [row + 1, col], [row + 2, col], [row + 3, col]] };
        }
      }
    }

    // Check diagonal (down-right)
    for (let row = 0; row <= ROWS - 4; row++) {
      for (let col = 0; col <= COLS - 4; col++) {
        const cell = board[row][col];
        if (cell && cell === board[row + 1][col + 1] && cell === board[row + 2][col + 2] && cell === board[row + 3][col + 3]) {
          return { winner: cell, cells: [[row, col], [row + 1, col + 1], [row + 2, col + 2], [row + 3, col + 3]] };
        }
      }
    }

    // Check diagonal (up-right)
    for (let row = 3; row < ROWS; row++) {
      for (let col = 0; col <= COLS - 4; col++) {
        const cell = board[row][col];
        if (cell && cell === board[row - 1][col + 1] && cell === board[row - 2][col + 2] && cell === board[row - 3][col + 3]) {
          return { winner: cell, cells: [[row, col], [row - 1, col + 1], [row - 2, col + 2], [row - 3, col + 3]] };
        }
      }
    }

    // Check for tie
    const isFull = board.every(row => row.every(cell => cell !== null));
    if (isFull) return { winner: 'TIE', cells: [] };

    return { winner: null, cells: [] };
  };

  const findLowestEmptyRow = (board: Board, col: number): number => {
    for (let row = ROWS - 1; row >= 0; row--) {
      if (board[row][col] === null) return row;
    }
    return -1;
  };

  const createGame = () => {
    if (!socket || !session) return;
    const userId = (session.user as any)?.id || session.user?.name || session.user?.email;
    const userName = session.user?.name || 'Guest';
    socket.emit('game:create', {
      gameType: 'connect4',
      user: { id: userId, name: userName },
    });
  };

  const joinGame = () => {
    if (!socket || !session || !inviteCode) return;
    const userId = (session.user as any)?.id || session.user?.name || session.user?.email;
    const userName = session.user?.name || 'Guest';
    console.log('[ConnectFour] Joining game:', { gameId: inviteCode, userId, userName });
    socket.emit('game:join', {
      gameId: inviteCode.trim(), // Trim whitespace
      user: { id: userId, name: userName },
    });
    setGameId(inviteCode.trim());
  };

  const handleColumnClick = (col: number) => {
    if (winner || currentPlayer !== myPlayer || !socket || !gameId || status !== 'PLAYING') return;

    const row = findLowestEmptyRow(board, col);
    if (row === -1) return;

    const newBoard = board.map(r => [...r]);
    newBoard[row][col] = currentPlayer;
    setBoard(newBoard);

    const result = checkWinner(newBoard);
    const newCurrentPlayer = currentPlayer === 1 ? 2 : 1;
    setCurrentPlayer(newCurrentPlayer);

    if (result.winner) {
      setWinner(result.winner);
      setWinningCells(result.cells);
      setStatus(result.winner === 'TIE' ? 'DRAW' : 'WIN');
    }

    socket.emit('game:move', {
      gameId,
      move: {
        board: newBoard,
        currentPlayer: newCurrentPlayer,
        winner: result.winner,
        winningCells: result.cells
      },
      user: { id: (session?.user as any)?.id, name: session?.user?.name },
    });
  };

  const resetGame = () => {
    setBoard(createEmptyBoard());
    setCurrentPlayer(1);
    setWinner(null);
    setWinningCells([]);
    setStatus('PLAYING');
    if (isHost) setMyPlayer(1);
  };

  const copyInviteCode = () => {
    navigator.clipboard.writeText(gameId || inviteCode);
  };

  const isWinningCell = (row: number, col: number) => {
    return winningCells.some(([r, c]) => r === row && c === col);
  };

  if (!session) {
    return (
      <GameBoyContainer isPlaying={false} gameOver={false}>
        <div className="w-full h-full flex items-center justify-center text-[#0f380f]">
          <div className="text-center text-xs">Please log in to play</div>
        </div>
      </GameBoyContainer>
    );
  }

  // Lobby screen
  if (status === 'LOBBY' && !gameId) {
    return (
      <GameBoyContainer isPlaying={false} gameOver={false}>
        <div className="w-full h-full flex flex-col items-center justify-center text-[#0f380f] p-4">
          <h2 className="text-lg font-black mb-4">CONNECT 4</h2>
          <p className="text-[10px] text-center mb-4 opacity-70">Get 4 in a row to win!</p>

          <div className="flex flex-col gap-3 w-full max-w-[200px]">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={createGame}
              className="w-full py-2 border-2 border-[#0f380f] text-[#0f380f] font-bold text-sm hover:bg-[#0f380f] hover:text-[#9ca04c] transition-colors"
            >
              CREATE GAME
            </motion.button>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                maxLength={50}
                className="flex-1 px-2 py-2 border-2 border-[#0f380f] bg-transparent text-[#0f380f] text-xs font-mono"
              />
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={joinGame}
                className="px-3 py-2 border-2 border-[#0f380f] text-[#0f380f] font-bold text-xs hover:bg-[#0f380f] hover:text-[#9ca04c] transition-colors"
              >
                JOIN
              </motion.button>
            </div>
          </div>
        </div>
      </GameBoyContainer>
    );
  }

  // Waiting for player
  if (status === 'LOBBY' && gameId && players.length < 2) {
    return (
      <GameBoyContainer isPlaying={false} gameOver={false}>
        <div className="w-full h-full flex flex-col items-center justify-center text-[#0f380f] p-4">
          <Wifi className="w-8 h-8 mb-2 animate-pulse" />
          <h3 className="text-sm font-bold mb-2">Waiting for player...</h3>

          <div className="flex items-center gap-2 mb-4">
            <span className="font-mono text-lg tracking-wider">{gameId}</span>
            <button type="button" onClick={copyInviteCode} className="p-1 hover:bg-[#0f380f]/20 rounded">
              <Copy size={14} />
            </button>
          </div>

          <p className="text-[10px] opacity-70 text-center">Share this code with a friend!</p>
        </div>
      </GameBoyContainer>
    );
  }

  return (
    <GameBoyContainer isPlaying={status === 'PLAYING'} gameOver={!!winner}>
      <div className="w-full h-full flex flex-col text-[#0f380f] p-2">
        {/* Header */}
        <div className="flex justify-between items-center text-[10px] font-mono mb-2">
          <span className={`flex items-center gap-1 ${currentPlayer === 1 && status === 'PLAYING' ? 'opacity-100' : 'opacity-50'}`}>
            <div className="w-3 h-3 rounded-full bg-red-500 border border-[#0f380f]" />
            {players[0]?.name?.slice(0, 8) || 'P1'}
            {myPlayer === 1 && ' (You)'}
          </span>
          <span className={`flex items-center gap-1 ${currentPlayer === 2 && status === 'PLAYING' ? 'opacity-100' : 'opacity-50'}`}>
            {players[1]?.name?.slice(0, 8) || 'P2'}
            {myPlayer === 2 && ' (You)'}
            <div className="w-3 h-3 rounded-full bg-yellow-400 border border-[#0f380f]" />
          </span>
        </div>

        {/* Game Board */}
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-[#0f380f] p-1 rounded">
            {board.map((row, rowIdx) => (
              <div key={rowIdx} className="flex">
                {row.map((cell, colIdx) => (
                  <motion.div
                    key={colIdx}
                    className="w-5 h-5 m-0.5 rounded-full bg-[#9ca04c] flex items-center justify-center cursor-pointer"
                    onMouseEnter={() => setHoverCol(colIdx)}
                    onMouseLeave={() => setHoverCol(null)}
                    onClick={() => handleColumnClick(colIdx)}
                    whileHover={!cell && currentPlayer === myPlayer && status === 'PLAYING' ? { scale: 1.1 } : undefined}
                  >
                    <AnimatePresence>
                      {cell && (
                        <motion.div
                          initial={{ y: -100, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ type: 'spring', damping: 15, stiffness: 300 }}
                          className={`w-4 h-4 rounded-full border border-[#0f380f]/50 ${
                            cell === 1 ? 'bg-red-500' : 'bg-yellow-400'
                          } ${isWinningCell(rowIdx, colIdx) ? 'ring-2 ring-white animate-pulse' : ''}`}
                        />
                      )}
                    </AnimatePresence>
                    {!cell && hoverCol === colIdx && rowIdx === findLowestEmptyRow(board, colIdx) &&
                     currentPlayer === myPlayer && status === 'PLAYING' && (
                      <div className={`w-4 h-4 rounded-full opacity-40 ${myPlayer === 1 ? 'bg-red-500' : 'bg-yellow-400'}`} />
                    )}
                  </motion.div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Status */}
        <div className="text-center text-xs font-bold mt-2">
          {status === 'PLAYING' && (
            currentPlayer === myPlayer
              ? <span className="animate-pulse">Your turn!</span>
              : <span className="opacity-70">Opponent's turn...</span>
          )}
        </div>
      </div>

      {/* Win/Draw Overlay */}
      <AnimatePresence>
        {winner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#9ca04c]/95 flex flex-col items-center justify-center rounded z-50"
          >
            <h2 className="text-xl font-black text-[#0f380f] mb-2">
              {winner === 'TIE' ? 'DRAW!' : winner === myPlayer ? 'YOU WIN!' : 'YOU LOSE!'}
            </h2>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={resetGame}
              className="mt-4 px-4 py-2 border-2 border-[#0f380f] text-[#0f380f] font-bold text-sm hover:bg-[#0f380f] hover:text-[#9ca04c] transition-colors flex items-center gap-2"
            >
              <RefreshCw size={14} />
              PLAY AGAIN
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </GameBoyContainer>
  );
}
