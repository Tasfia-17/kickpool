'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import { usePokemonTheme } from '@/components/PokemonThemeProvider';
import { useSession } from 'next-auth/react';
import { io, Socket } from 'socket.io-client';
import { Users, UserPlus, Wifi, List } from 'lucide-react';
import { GameBoyContainer } from './GameBoyContainer';
import { GameLobbyBrowser } from './GameLobbyBrowser';

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Position = { x: number; y: number };

const GRID_SIZE = 20;
const CELL_SIZE = 12;

export function MultiplayerSnake() {
  usePokemonTheme(); // Theme context for consistency
  const { data: session } = useSession();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [mySnake, setMySnake] = useState<Position[]>([{ x: 10, y: 10 }]);
  const [opponentSnake, setOpponentSnake] = useState<Position[]>([]);
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [food, setFood] = useState<Position>({ x: 15, y: 15 });
  const [gameOver, setGameOver] = useState(false);
  const [myScore, setMyScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [gameId, setGameId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Array<{ id: string; name: string }>>([]);
  const [isHost, setIsHost] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [showLobbyBrowser, setShowLobbyBrowser] = useState(false);
  const directionRef = useRef<Direction>('RIGHT');
  const myScoreRef = useRef(0);
  const foodRef = useRef<Position>({ x: 15, y: 15 });

  // Keep refs in sync with state
  useEffect(() => {
    myScoreRef.current = myScore;
  }, [myScore]);

  useEffect(() => {
    foodRef.current = food;
  }, [food]);

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
      console.log('[Snake] game:created received:', { gameId, initialPlayers });
      setGameId(gameId);
      setInviteCode(gameId);
      setIsHost(true);
      // Set initial players if provided (host should see themselves)
      if (initialPlayers && initialPlayers.length > 0) {
        console.log('[Snake] Setting initial players:', initialPlayers);
        setPlayers(initialPlayers);
      }
    });

    newSocket.on('game:player_joined', ({ players: newPlayers }: { players: Array<{ id: string; name: string }> }) => {
      console.log('[Snake] game:player_joined received:', newPlayers);
      setPlayers(newPlayers);
      if (newPlayers.length >= 2) {
        startGame();
      }
    });

    newSocket.on('game:state_sync', ({ state, from }: { state: any; from: { id: string; name: string } }) => {
      const userId = (session.user as any)?.id || session.user?.name || session.user?.email;
      if (from.id !== userId) {
        if (state.opponentSnake) setOpponentSnake(state.opponentSnake);
        if (state.food) setFood(state.food);
        if (state.opponentScore !== undefined) setOpponentScore(state.opponentScore);
        if (state.gameOver) setGameOver(true);
      }
    });

    newSocket.on('game:error', ({ message }: { message: string }) => {
      console.error('[Snake] Game error:', message);
      alert(message);
    });

    newSocket.on('game:player_left', ({ players: newPlayers }: { players: Array<{ id: string; name: string }> }) => {
      console.log('[Snake] game:player_left received:', newPlayers);
      setPlayers(newPlayers);
      if (newPlayers.length < 2 && isPlaying) {
        setIsPlaying(false);
        setGameOver(true);
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
  }, [session, gameId]);

  const generateFood = (): Position => {
    return {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  };

  const startGame = () => {
    setMySnake([{ x: 10, y: 10 }]);
    setOpponentSnake([{ x: 10, y: 5 }]);
    setDirection('RIGHT');
    directionRef.current = 'RIGHT';
    setFood(generateFood());
    setGameOver(false);
    setMyScore(0);
    setOpponentScore(0);
    setIsPlaying(true);
  };

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (!isPlaying) return;

    const key = e.key;
    const currentDir = directionRef.current;

    if (key === 'ArrowUp' && currentDir !== 'DOWN') {
      directionRef.current = 'UP';
      setDirection('UP');
    } else if (key === 'ArrowDown' && currentDir !== 'UP') {
      directionRef.current = 'DOWN';
      setDirection('DOWN');
    } else if (key === 'ArrowLeft' && currentDir !== 'RIGHT') {
      directionRef.current = 'LEFT';
      setDirection('LEFT');
    } else if (key === 'ArrowRight' && currentDir !== 'LEFT') {
      directionRef.current = 'RIGHT';
      setDirection('RIGHT');
    }
  }, [isPlaying]);

  useEffect(() => {
    if (isPlaying && !gameOver) {
      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }
  }, [isPlaying, gameOver, handleKeyPress]);

  useEffect(() => {
    if (!isPlaying || gameOver || !socket || !gameId) return;

    const gameLoop = setInterval(() => {
      setMySnake(prevSnake => {
        const head = { ...prevSnake[0] };
        const dir = directionRef.current;

        if (dir === 'UP') head.y -= 1;
        else if (dir === 'DOWN') head.y += 1;
        else if (dir === 'LEFT') head.x -= 1;
        else if (dir === 'RIGHT') head.x += 1;

        // Check wall collision
        if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
          setGameOver(true);
          setIsPlaying(false);
          socket.emit('game:state_update', {
            gameId,
            state: { gameOver: true },
            user: { id: session?.user?.id, name: session?.user?.name },
          });
          return prevSnake;
        }

        // Check self collision
        if (prevSnake.some(segment => segment.x === head.x && segment.y === head.y)) {
          setGameOver(true);
          setIsPlaying(false);
          socket.emit('game:state_update', {
            gameId,
            state: { gameOver: true },
            user: { id: session?.user?.id, name: session?.user?.name },
          });
          return prevSnake;
        }

        const newSnake = [head, ...prevSnake];
        const currentFood = foodRef.current;

        // Check food collision (use ref for current food position)
        if (head.x === currentFood.x && head.y === currentFood.y) {
          const newScore = myScoreRef.current + 10;
          setMyScore(newScore);
          const newFood = generateFood();
          setFood(newFood);
          socket.emit('game:state_update', {
            gameId,
            state: { food: newFood, myScore: newScore },
            user: { id: session?.user?.id, name: session?.user?.name },
          });
        } else {
          newSnake.pop();
        }

        // Sync state
        socket.emit('game:state_update', {
          gameId,
          state: { mySnake: newSnake },
          user: { id: session?.user?.id, name: session?.user?.name },
        });

        return newSnake;
      });
    }, 150);

    return () => clearInterval(gameLoop);
  }, [isPlaying, gameOver, socket, gameId, session]);

  const createGame = () => {
    if (!socket || !session) return;
    const userId = (session.user as any).id || session.user.name || session.user.email;
    const userName = session.user.name || 'Guest';
    console.log('[Snake] Creating game:', { userId, userName });
    socket.emit('game:create', {
      gameType: 'snake',
      user: { id: userId, name: userName },
    });
  };

  const joinGame = () => {
    if (!socket || !session || !inviteCode) return;

    // Validate code is 5 digits
    const trimmedCode = inviteCode.trim().replace(/\D/g, '');
    if (trimmedCode.length !== 5) {
      alert('Please enter a valid 5-digit code');
      return;
    }

    const userId = (session.user as any).id || session.user.name || session.user.email;
    const userName = session.user.name || 'Guest';
    console.log('[Snake] Joining game:', { gameId: trimmedCode, userId, userName });

    // Reset state before joining
    setGameId(null);
    setPlayers([]);
    setIsHost(false);

    socket.emit('game:join', {
      gameId: trimmedCode,
      user: { id: userId, name: userName },
    });
    setGameId(trimmedCode);
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

  if (!gameId) {
    return (
      <GameBoyContainer isPlaying={false} gameOver={false}>
        {showLobbyBrowser ? (
          <GameLobbyBrowser
            gameType="snake"
            onJoinGame={(gameId) => {
              setInviteCode(gameId);
              setShowLobbyBrowser(false);
              // Reset state before joining
              setGameId(null);
              setPlayers([]);
              setIsHost(false);
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
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-[#0f380f]">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowLobbyBrowser(true)}
              className="w-full px-4 py-2 border-2 border-[#0f380f] text-[#0f380f] font-bold hover:bg-[#0f380f] hover:text-[#9ca04c] transition-colors text-xs"
            >
              <List size={12} className="inline mr-1" /> BROWSE LOBBIES
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={createGame}
              className="w-full px-4 py-2 border-2 border-[#0f380f] text-[#0f380f] font-bold hover:bg-[#0f380f] hover:text-[#9ca04c] transition-colors text-xs"
            >
              <Users size={12} className="inline mr-1" /> CREATE GAME
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
                disabled={!inviteCode || inviteCode.length !== 5}
                className="px-3 py-1.5 border-2 border-[#0f380f] text-[#0f380f] font-bold hover:bg-[#0f380f] hover:text-[#9ca04c] transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <UserPlus size={10} className="inline" /> JOIN
              </motion.button>
            </div>
          </div>
        )}
      </GameBoyContainer>
    );
  }

  return (
    <GameBoyContainer isPlaying={isPlaying} gameOver={gameOver}>
      <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-[#0f380f]">
        {/* Header */}
        <div className="flex justify-between items-center w-full text-[10px] font-mono mb-1">
          <div className="flex items-center gap-1">
            <Wifi size={8} className={socket?.connected ? 'text-green-500' : 'text-red-500'} />
            <span>{players.length}/2</span>
          </div>
          {isPlaying && (
            <div className="flex gap-3">
              <div>YOU: {myScore}</div>
              <div>OPP: {opponentScore}</div>
            </div>
          )}
        </div>

        {players.length < 2 && (
          <div className="text-center">
            <p className="text-xs font-bold mb-1">WAITING...</p>
            <p className="text-[10px] opacity-70 font-mono">CODE: {gameId}</p>
          </div>
        )}

        {!isPlaying && players.length >= 2 && (
          <div className="text-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={startGame}
              className="px-4 py-2 border-2 border-[#0f380f] text-[#0f380f] font-bold hover:bg-[#0f380f] hover:text-[#9ca04c] transition-colors text-xs"
            >
              START GAME
            </motion.button>
          </div>
        )}

        {isPlaying && (
          <>
            <div
              className="relative border-2 border-[#0f380f]"
              style={{
                width: GRID_SIZE * CELL_SIZE,
                height: GRID_SIZE * CELL_SIZE,
                backgroundColor: '#9ca04c',
              }}
            >
              {/* Food */}
              <div
                className="absolute bg-[#0f380f] rounded-full"
                style={{
                  left: food.x * CELL_SIZE + 2,
                  top: food.y * CELL_SIZE + 2,
                  width: CELL_SIZE - 4,
                  height: CELL_SIZE - 4,
                }}
              />

              {/* My Snake */}
              {mySnake.map((segment, idx) => (
                <div
                  key={idx}
                  className="absolute bg-[#0f380f]"
                  style={{
                    left: segment.x * CELL_SIZE + 1,
                    top: segment.y * CELL_SIZE + 1,
                    width: CELL_SIZE - 2,
                    height: CELL_SIZE - 2,
                  }}
                />
              ))}

              {/* Opponent Snake */}
              {opponentSnake.map((segment, idx) => (
                <div
                  key={`opp-${idx}`}
                  className="absolute bg-[#0f380f]/60"
                  style={{
                    left: segment.x * CELL_SIZE + 1,
                    top: segment.y * CELL_SIZE + 1,
                    width: CELL_SIZE - 2,
                    height: CELL_SIZE - 2,
                  }}
                />
              ))}
            </div>

            {gameOver && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-[#9ca04c]/95 backdrop-blur-[2px] rounded"
              >
                <div className="text-center">
                  <div className="text-sm font-black mb-2">GAME OVER!</div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={startGame}
                    className="px-4 py-1.5 border-2 border-[#0f380f] text-[#0f380f] font-bold hover:bg-[#0f380f] hover:text-[#9ca04c] transition-colors text-xs"
                  >
                    PLAY AGAIN
                  </motion.button>
                </div>
              </motion.div>
            )}

            <p className="text-[10px] opacity-70 font-mono text-center mt-1">
              Use arrow keys
            </p>
          </>
        )}
      </div>
    </GameBoyContainer>
  );
}

