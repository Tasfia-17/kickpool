'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { usePokemonTheme } from '@/components/PokemonThemeProvider';
import { useSession } from 'next-auth/react';
import { io, Socket } from 'socket.io-client';
import { Wifi, Copy, Swords, List } from 'lucide-react';
import { GameBoyContainer } from './GameBoyContainer';
import { GameLobbyBrowser } from './GameLobbyBrowser';

type Player = 'X' | 'O' | null;
type Board = Player[];

export function MultiplayerTicTacToe() {
  const { isDarkMode } = usePokemonTheme();
  const { data: session } = useSession();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState<Player>('X');
  const [mySymbol, setMySymbol] = useState<Player>(null);
  const [winner, setWinner] = useState<Player | 'TIE' | null>(null);
  const [winningLine, setWinningLine] = useState<number[] | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Array<{ id: string; name: string }>>([]);
  const [isHost, setIsHost] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [status, setStatus] = useState<'LOBBY' | 'PLAYING' | 'WIN' | 'DRAW'>('LOBBY');
  const [showLobbyBrowser, setShowLobbyBrowser] = useState(false);

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

    newSocket.on('connect', () => {
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    newSocket.on('game:created', ({ gameId, players: initialPlayers }: { gameId: string; players?: Array<{ id: string; name: string }> }) => {
      console.log('[TicTacToe] game:created received:', { gameId, initialPlayers });
      setGameId(gameId);
      setInviteCode(gameId);
      setIsHost(true);
      setMySymbol('X'); // Host is always X
      setCurrentPlayer('X');
      setStatus('LOBBY');
      // Reset game state
      setBoard(Array(9).fill(null));
      setWinner(null);
      setWinningLine(null);
      // Set initial players if provided (host should see themselves)
      if (initialPlayers && initialPlayers.length > 0) {
        console.log('[TicTacToe] Setting initial players:', initialPlayers);
        setPlayers(initialPlayers);
      } else {
        // Ensure players array is initialized
        const userId = (session.user as any)?.id || session.user?.name || session.user?.email;
        const userName = session.user?.name || 'Guest';
        setPlayers([{ id: userId, name: userName }]);
      }
    });

    newSocket.on('game:player_joined', ({ players: newPlayers }: { players: Array<{ id: string; name: string }> }) => {
      console.log('[TicTacToe] game:player_joined received:', newPlayers);
      setPlayers(newPlayers);
      if (newPlayers.length === 2) {
        setStatus('PLAYING');
        const userId = (session.user as any)?.id || session.user?.name || session.user?.email;
        // Set symbol if not already set (for joining players)
        if (!mySymbol) {
          const isFirstPlayer = newPlayers[0].id === userId;
          setMySymbol(isFirstPlayer ? 'X' : 'O');
        }
        // Always reset to X's turn when game starts
        setCurrentPlayer('X');
        // Reset board when game starts
        setBoard(Array(9).fill(null));
        setWinner(null);
        setWinningLine(null);
        console.log('[TicTacToe] Game started! Players:', newPlayers);
      }
    });

    newSocket.on('game:move_received', ({ move, from }: { move: any; from: { id: string; name: string } }) => {
      const userId = (session.user as any)?.id || session.user?.name || session.user?.email;
      if (from.id !== userId) {
        setBoard(move.board);
        setCurrentPlayer(move.currentPlayer);
        const winnerResult = checkWinner(move.board);
        if (winnerResult) {
          if (winnerResult === 'TIE') {
            setWinner('TIE');
            setStatus('DRAW');
          } else {
            setWinner(winnerResult);
            setStatus('WIN');
          }
        }
      }
    });

    newSocket.on('game:error', ({ message }: { message: string }) => {
      console.error('[TicTacToe] Game error:', message);
      alert(message);
    });

    newSocket.on('game:player_left', ({ players: newPlayers }: { players: Array<{ id: string; name: string }> }) => {
      console.log('[TicTacToe] game:player_left received:', newPlayers);
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
  }, [session, mySymbol, gameId]);

  const checkWinner = (board: Board): Player | 'TIE' | null => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6],
    ];

    for (const line of lines) {
      const [a, b, c] = line;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        setWinningLine(line);
        return board[a] as Player;
      }
    }

    if (board.every(cell => cell !== null)) {
      return 'TIE';
    }

    setWinningLine(null);
    return null;
  };

  const createGame = () => {
    if (!socket || !session) return;
    const userId = (session.user as any).id || session.user.name || session.user.email;
    const userName = session.user.name || 'Guest';
    console.log('[TicTacToe] Creating game:', { userId, userName });
    socket.emit('game:create', {
      gameType: 'tictactoe',
      user: { id: userId, name: userName },
    });
  };

  const joinGame = () => {
    if (!socket || !session || !inviteCode) return;
    const userId = (session.user as any).id || session.user.name || session.user.email;
    const userName = session.user.name || 'Guest';
    const trimmedCode = inviteCode.trim();
    console.log('[TicTacToe] Joining game:', { gameId: trimmedCode, userId, userName });

    // Reset state before joining
    setGameId(null);
    setPlayers([]);
    setMySymbol(null);
    setStatus('LOBBY');
    setBoard(Array(9).fill(null));
    setWinner(null);
    setWinningLine(null);

    socket.emit('game:join', {
      gameId: trimmedCode,
      user: { id: userId, name: userName },
    });
    setGameId(trimmedCode);
  };

  const handleCellClick = (index: number) => {
    if (board[index] || winner || currentPlayer !== mySymbol || !socket || !gameId || status !== 'PLAYING' || players.length < 2) return;

    const newBoard = [...board];
    newBoard[index] = currentPlayer;
    setBoard(newBoard);

    const newCurrentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    setCurrentPlayer(newCurrentPlayer);

    const gameWinner = checkWinner(newBoard);
    if (gameWinner) {
      if (gameWinner === 'TIE') {
        setWinner('TIE');
        setStatus('DRAW');
      } else {
        setWinner(gameWinner);
        setStatus('WIN');
      }
    }

    socket.emit('game:move', {
      gameId,
      move: { board: newBoard, currentPlayer: newCurrentPlayer },
      user: { id: session?.user?.id, name: session?.user?.name },
    });
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setCurrentPlayer('X');
    setWinner(null);
    setWinningLine(null);
    setStatus('PLAYING');
    if (isHost) {
      setMySymbol('X');
    }
  };

  const copyInviteCode = () => {
    navigator.clipboard.writeText(gameId || inviteCode);
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

  const isPlaying = status === 'PLAYING';
  const gameOver = status === 'WIN' || status === 'DRAW';

  return (
    <GameBoyContainer isPlaying={isPlaying} gameOver={gameOver}>
      <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-[#0f380f]">

        {/* HEADER HUD */}
        <div className="w-full flex justify-between items-center text-[10px] font-mono mb-1">
          <div className="flex items-center gap-1">
            <Wifi size={8} className={socket?.connected ? 'text-green-500 animate-pulse' : 'text-red-500'} />
            {status === 'LOBBY' ? 'WAITING...' : socket?.connected ? 'ONLINE' : 'OFFLINE'}
          </div>
          <div className="text-[8px]">PLAYERS: {players.length}/2</div>
        </div>

        {status === 'LOBBY' && !gameId ? (
          showLobbyBrowser ? (
            <GameLobbyBrowser
              gameType="tictactoe"
              onJoinGame={(gameId) => {
                setInviteCode(gameId);
                setShowLobbyBrowser(false);
                // Reset state before joining
                setGameId(null);
                setPlayers([]);
                setMySymbol(null);
                setStatus('LOBBY');
                setBoard(Array(9).fill(null));
                setWinner(null);
                setWinningLine(null);
                // Join the game
                if (socket && session) {
                  const userId = (session.user as any).id || session.user.name || session.user.email;
                  const userName = session.user.name || 'Guest';
                  socket.emit('game:join', {
                    gameId,
                    user: { id: userId, name: userName },
                  });
                  setGameId(gameId);
                }
              }}
              onCreateGame={() => {
                setShowLobbyBrowser(false);
                createGame();
              }}
              onBack={() => setShowLobbyBrowser(false)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 w-full">
              <p className={`text-[9px] ${connected ? 'text-green-700' : 'text-red-700'}`}>
                {connected ? '● Connected' : '○ Connecting...'}
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowLobbyBrowser(true)}
                disabled={!connected}
                className="w-full px-4 py-2 border-2 border-[#0f380f] text-[#0f380f] font-bold hover:bg-[#0f380f] hover:text-[#9ca04c] transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <List size={12} className="inline mr-1" /> BROWSE LOBBIES
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={createGame}
                disabled={!connected}
                className="w-full px-4 py-2 border-2 border-[#0f380f] text-[#0f380f] font-bold hover:bg-[#0f380f] hover:text-[#9ca04c] transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Swords size={12} className="inline mr-1" /> CREATE GAME
              </motion.button>

              <div className="flex gap-1 w-full">
                <input
                  type="text"
                  placeholder="Enter 5-digit code"
                  value={inviteCode}
                  onChange={(e) => {
                    // Only allow digits, max 5 characters
                    const value = e.target.value.replace(/\D/g, '').slice(0, 5);
                    setInviteCode(value);
                  }}
                  maxLength={5}
                  className="flex-1 border border-[#0f380f] bg-[#0f380f]/10 text-[#0f380f] p-1.5 font-mono outline-none rounded text-[10px] text-center"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={joinGame}
                  disabled={!connected || !inviteCode}
                  className="px-3 py-1.5 border-2 border-[#0f380f] text-[#0f380f] font-bold hover:bg-[#0f380f] hover:text-[#9ca04c] transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  JOIN
                </motion.button>
              </div>
            </div>
          )
        ) : status === 'LOBBY' && gameId ? (
          <div className="flex flex-col items-center justify-center gap-3 w-full">
            <Swords size={24} className="text-[#0f380f]/50" />
            <div className="text-center">
              <h3 className="font-bold text-sm mb-1">WAITING...</h3>
              <div className="flex items-center gap-1 mb-2">
                <input
                  type="text"
                  value={gameId || ''}
                  readOnly
                  className="px-2 py-1 bg-[#0f380f]/10 text-[#0f380f] font-mono text-[10px] border border-[#0f380f]/30 rounded text-center w-20"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={copyInviteCode}
                  className="px-2 py-1 border-2 border-[#0f380f] text-[#0f380f] font-bold hover:bg-[#0f380f] hover:text-[#9ca04c] transition-colors text-[10px]"
                >
                  <Copy size={10} className="inline" />
                </motion.button>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative w-full">
            {/* THE GRID */}
            <div className="grid grid-cols-3 gap-1 p-1">
              {board.map((cell, i) => {
                const isWinningCell = winningLine?.includes(i);

                return (
                  <motion.button
                    key={i}
                    whileHover={{ scale: cell ? 1 : 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    disabled={!!cell || !!winner || currentPlayer !== mySymbol || players.length < 2}
                    className={`
                      w-12 h-12 rounded flex items-center justify-center relative overflow-hidden text-lg font-black
                      ${isWinningCell ? 'ring-2 ring-yellow-400' : ''}
                      ${cell === 'X'
                        ? 'bg-blue-500 text-white'
                        : cell === 'O'
                          ? 'bg-red-500 text-white'
                          : 'bg-[#0f380f]/30 hover:bg-[#0f380f]/50 border border-[#0f380f]/50'
                      }
                      ${!cell && !winner && currentPlayer === mySymbol && players.length >= 2 ? 'cursor-pointer' : 'cursor-not-allowed'}
                    `}
                  >
                    {cell}
                  </motion.button>
                );
              })}
            </div>

            {/* TURN INDICATOR */}
            <div className={`mt-2 text-center font-black text-xs ${currentPlayer === mySymbol && players.length >= 2 ? 'text-green-500' : 'text-gray-500'}`}>
              {players.length < 2 ? 'WAITING FOR PLAYER 2...' : !mySymbol ? 'ASSIGNING SYMBOL...' : currentPlayer === mySymbol ? 'YOUR TURN' : 'OPPONENT TURN'}
            </div>

            {/* Debug info (remove in production) */}
            {process.env.NODE_ENV !== 'production' && (
              <div className="mt-1 text-[8px] text-center opacity-50">
                Status: {status} | Players: {players.length} | MySymbol: {mySymbol || 'none'} | Current: {currentPlayer}
              </div>
            )}

            {/* WINNER ANNOUNCEMENT */}
            {winner && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-[#9ca04c]/95 backdrop-blur-[2px] rounded"
              >
                <div className="text-center">
                  <div className="text-sm font-black mb-2">
                    {winner === 'TIE' ? "TIE!" : `${winner === mySymbol ? 'YOU WIN!' : `${winner} WINS!`}`}
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={resetGame}
                    className="px-4 py-1.5 border-2 border-[#0f380f] text-[#0f380f] font-bold hover:bg-[#0f380f] hover:text-[#9ca04c] transition-colors text-xs"
                  >
                    PLAY AGAIN
                  </motion.button>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </GameBoyContainer>
  );
}
