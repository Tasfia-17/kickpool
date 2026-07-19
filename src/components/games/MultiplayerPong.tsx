'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSession } from 'next-auth/react';
import { io, Socket } from 'socket.io-client';
import { Wifi, Copy, RefreshCw } from 'lucide-react';
import { GameBoyContainer } from './GameBoyContainer';

const CANVAS_WIDTH = 200;
const CANVAS_HEIGHT = 160;
const PADDLE_HEIGHT = 30;
const PADDLE_WIDTH = 6;
const BALL_SIZE = 6;
const WINNING_SCORE = 5;

export function MultiplayerPong() {
  const { data: session } = useSession();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Array<{ id: string; name: string }>>([]);
  const [isHost, setIsHost] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [status, setStatus] = useState<'LOBBY' | 'PLAYING' | 'WIN' | 'LOSE'>('LOBBY');
  const [score, setScore] = useState<[number, number]>([0, 0]);
  const [myPaddleY, setMyPaddleY] = useState(CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2);
  const [enemyPaddleY, setEnemyPaddleY] = useState(CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2);
  const [ball, setBall] = useState({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, vx: 2, vy: 1 });

  const gameLoopRef = useRef<number | undefined>(undefined);
  const lastSyncRef = useRef<number>(0);

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
      console.log('[Pong] game:created received:', { gameId, initialPlayers });
      setGameId(gameId);
      setInviteCode(gameId);
      setIsHost(true);
      setStatus('LOBBY');
      // Set initial players if provided (host should see themselves)
      if (initialPlayers && initialPlayers.length > 0) {
        console.log('[Pong] Setting initial players:', initialPlayers);
        setPlayers(initialPlayers);
      }
    });

    newSocket.on('game:player_joined', ({ players: newPlayers }: { players: Array<{ id: string; name: string }> }) => {
      console.log('[Pong] game:player_joined received:', newPlayers);
      setPlayers(newPlayers);
      if (newPlayers.length === 2) {
        setStatus('PLAYING');
        setBall({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, vx: 2, vy: 1 });
      }
    });

    newSocket.on('game:move_received', ({ move, from }: { move: any; from: { id: string; name: string } }) => {
      const userId = (session.user as any)?.id || session.user?.name || session.user?.email;
      if (from.id !== userId) {
        if (move.type === 'paddle') {
          setEnemyPaddleY(CANVAS_HEIGHT - move.y - PADDLE_HEIGHT); // Mirror Y position
        } else if (move.type === 'ball') {
          // Host controls ball state
          setBall({
            x: CANVAS_WIDTH - move.ball.x, // Mirror X
            y: move.ball.y,
            vx: -move.ball.vx,
            vy: move.ball.vy
          });
          setScore([move.score[1], move.score[0]]); // Swap scores for guest view
        } else if (move.type === 'game_over') {
          setStatus(move.winner === 'host' ? (isHost ? 'WIN' : 'LOSE') : (isHost ? 'LOSE' : 'WIN'));
        }
      }
    });

    newSocket.on('game:error', ({ message }: { message: string }) => {
      console.error('[Pong] Game error:', message);
      alert(message);
    });

    newSocket.on('game:player_left', ({ players: newPlayers }: { players: Array<{ id: string; name: string }> }) => {
      console.log('[Pong] game:player_left received:', newPlayers);
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
  }, [session, gameId, isHost]);

  // Handle mouse/touch movement
  const handlePointerMove = useCallback((e: React.PointerEvent | React.TouchEvent) => {
    if (status !== 'PLAYING') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.PointerEvent).clientY;
    const y = ((clientY - rect.top) / rect.height) * CANVAS_HEIGHT;
    const paddleY = Math.max(0, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, y - PADDLE_HEIGHT / 2));

    setMyPaddleY(paddleY);

    // Throttle sync to ~30fps
    const now = Date.now();
    if (now - lastSyncRef.current > 33 && socket && gameId) {
      lastSyncRef.current = now;
      socket.emit('game:move', {
        gameId,
        move: { type: 'paddle', y: paddleY },
        user: { id: (session?.user as any)?.id, name: session?.user?.name },
      });
    }
  }, [status, socket, gameId, session]);

  // Game loop (host only controls ball)
  useEffect(() => {
    if (status !== 'PLAYING' || !isHost) return;

    const updateGame = () => {
      setBall(prev => {
        let { x, y, vx, vy } = prev;

        // Move ball
        x += vx;
        y += vy;

        // Bounce off top/bottom
        if (y <= 0 || y >= CANVAS_HEIGHT - BALL_SIZE) {
          vy = -vy;
          y = y <= 0 ? 0 : CANVAS_HEIGHT - BALL_SIZE;
        }

        // Check paddle collision (left - my paddle)
        if (x <= PADDLE_WIDTH && y + BALL_SIZE >= myPaddleY && y <= myPaddleY + PADDLE_HEIGHT) {
          vx = Math.abs(vx) * 1.05; // Speed up slightly
          const hitPos = (y - myPaddleY) / PADDLE_HEIGHT;
          vy = (hitPos - 0.5) * 4;
          x = PADDLE_WIDTH;
        }

        // Check paddle collision (right - enemy paddle)
        if (x >= CANVAS_WIDTH - PADDLE_WIDTH - BALL_SIZE &&
            y + BALL_SIZE >= enemyPaddleY && y <= enemyPaddleY + PADDLE_HEIGHT) {
          vx = -Math.abs(vx) * 1.05;
          const hitPos = (y - enemyPaddleY) / PADDLE_HEIGHT;
          vy = (hitPos - 0.5) * 4;
          x = CANVAS_WIDTH - PADDLE_WIDTH - BALL_SIZE;
        }

        // Score (ball went past paddle)
        if (x < 0) {
          // Enemy scores
          setScore(prev => {
            const newScore: [number, number] = [prev[0], prev[1] + 1];
            if (newScore[1] >= WINNING_SCORE && socket && gameId) {
              socket.emit('game:move', {
                gameId,
                move: { type: 'game_over', winner: 'guest' },
                user: { id: (session?.user as any)?.id, name: session?.user?.name },
              });
              setStatus('LOSE');
            }
            return newScore;
          });
          return { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, vx: 2, vy: 1 };
        }

        if (x > CANVAS_WIDTH) {
          // I score
          setScore(prev => {
            const newScore: [number, number] = [prev[0] + 1, prev[1]];
            if (newScore[0] >= WINNING_SCORE && socket && gameId) {
              socket.emit('game:move', {
                gameId,
                move: { type: 'game_over', winner: 'host' },
                user: { id: (session?.user as any)?.id, name: session?.user?.name },
              });
              setStatus('WIN');
            }
            return newScore;
          });
          return { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, vx: -2, vy: 1 };
        }

        // Sync ball position
        if (socket && gameId) {
          socket.emit('game:move', {
            gameId,
            move: { type: 'ball', ball: { x, y, vx, vy }, score },
            user: { id: (session?.user as any)?.id, name: session?.user?.name },
          });
        }

        return { x, y, vx, vy };
      });

      gameLoopRef.current = requestAnimationFrame(updateGame);
    };

    gameLoopRef.current = requestAnimationFrame(updateGame);

    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [status, isHost, myPaddleY, enemyPaddleY, socket, gameId, session, score]);

  // Draw game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.fillStyle = '#9ca04c';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Center line
    ctx.strokeStyle = '#0f380f';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH / 2, 0);
    ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);

    // Paddles
    ctx.fillStyle = '#0f380f';
    ctx.fillRect(0, myPaddleY, PADDLE_WIDTH, PADDLE_HEIGHT);
    ctx.fillRect(CANVAS_WIDTH - PADDLE_WIDTH, enemyPaddleY, PADDLE_WIDTH, PADDLE_HEIGHT);

    // Ball
    ctx.fillRect(ball.x, ball.y, BALL_SIZE, BALL_SIZE);

  }, [ball, myPaddleY, enemyPaddleY]);

  const createGame = () => {
    if (!socket || !session) return;
    const userId = (session.user as any)?.id || session.user?.name || session.user?.email;
    const userName = session.user?.name || 'Guest';
    socket.emit('game:create', {
      gameType: 'pong',
      user: { id: userId, name: userName },
    });
  };

  const joinGame = () => {
    if (!socket || !session || !inviteCode) return;
    const userId = (session.user as any)?.id || session.user?.name || session.user?.email;
    const userName = session.user?.name || 'Guest';
    console.log('[Pong] Joining game:', { gameId: inviteCode, userId, userName });
    socket.emit('game:join', {
      gameId: inviteCode.trim(), // Trim whitespace
      user: { id: userId, name: userName },
    });
    setGameId(inviteCode.trim());
  };

  const copyInviteCode = () => {
    navigator.clipboard.writeText(gameId || inviteCode);
  };

  const resetGame = () => {
    setScore([0, 0]);
    setBall({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, vx: 2, vy: 1 });
    setMyPaddleY(CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2);
    setEnemyPaddleY(CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2);
    setStatus('PLAYING');
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
          <h2 className="text-lg font-black mb-4">PONG</h2>
          <p className="text-[10px] text-center mb-2 opacity-70">First to {WINNING_SCORE} wins!</p>
          <p className={`text-[9px] mb-3 ${connected ? 'text-green-700' : 'text-red-700'}`}>
            {connected ? '● Connected' : '○ Connecting...'}
          </p>

          <div className="flex flex-col gap-3 w-full max-w-[200px]">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={createGame}
              disabled={!connected}
              className="w-full py-2 border-2 border-[#0f380f] text-[#0f380f] font-bold text-sm hover:bg-[#0f380f] hover:text-[#9ca04c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                disabled={!connected}
                className="px-3 py-2 border-2 border-[#0f380f] text-[#0f380f] font-bold text-xs hover:bg-[#0f380f] hover:text-[#9ca04c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

  // Game play
  return (
    <GameBoyContainer isPlaying={status === 'PLAYING'} gameOver={status === 'WIN' || status === 'LOSE'}>
      <div className="w-full h-full flex flex-col text-[#0f380f] p-2">
        {/* Score */}
        <div className="flex justify-between items-center text-sm font-bold mb-2">
          <span className="flex items-center gap-1">
            YOU: {score[0]}
          </span>
          <span className="flex items-center gap-1">
            {score[1]} :OPP
          </span>
        </div>

        {/* Game Canvas */}
        <div className="flex-1 flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="border-2 border-[#0f380f] touch-none cursor-none"
            onPointerMove={handlePointerMove}
            onTouchMove={handlePointerMove as any}
          />
        </div>

        <div className="text-center text-[10px] mt-2 opacity-70">
          Move pointer up/down to control paddle
        </div>
      </div>

      {/* Win/Lose Overlay */}
      <AnimatePresence>
        {(status === 'WIN' || status === 'LOSE') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#9ca04c]/95 flex flex-col items-center justify-center rounded z-50"
          >
            <h2 className="text-xl font-black text-[#0f380f] mb-2">
              {status === 'WIN' ? 'YOU WIN!' : 'YOU LOSE!'}
            </h2>
            <p className="text-sm text-[#0f380f] mb-4">{score[0]} - {score[1]}</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={resetGame}
              className="mt-2 px-4 py-2 border-2 border-[#0f380f] text-[#0f380f] font-bold text-sm hover:bg-[#0f380f] hover:text-[#9ca04c] transition-colors flex items-center gap-2"
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
