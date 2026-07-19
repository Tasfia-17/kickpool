'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { useSession } from 'next-auth/react';
import { GameBoyContainer } from './GameBoyContainer';
import { RotateCcw } from 'lucide-react';

const CANVAS_WIDTH = 240;
const CANVAS_HEIGHT = 280;
const PADDLE_WIDTH = 50;
const PADDLE_HEIGHT = 8;
const BALL_RADIUS = 5;
const BRICK_ROWS = 5;
const BRICK_COLS = 8;
const BRICK_WIDTH = 26;
const BRICK_HEIGHT = 12;
const BRICK_PADDING = 2;

interface Brick {
  x: number;
  y: number;
  alive: boolean;
  color: string;
}

const BRICK_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4'];

export function BreakoutGame() {
  const { data: session } = useSession();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover' | 'win'>('menu');

  const paddleRef = useRef({ x: CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2 });
  const ballRef = useRef({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 50, vx: 3, vy: -3 });
  const bricksRef = useRef<Brick[]>([]);
  const gameLoopRef = useRef<number | undefined>(undefined);

  // Fetch high score
  useEffect(() => {
    if (session) {
      fetch('/api/minigames/score?gameType=breakout')
        .then(res => res.json())
        .then(data => setHighScore(data.highScore || 0))
        .catch(() => { });
    }
  }, [session]);

  const initBricks = useCallback(() => {
    const bricks: Brick[] = [];
    const startX = (CANVAS_WIDTH - (BRICK_COLS * (BRICK_WIDTH + BRICK_PADDING))) / 2;

    for (let row = 0; row < BRICK_ROWS; row++) {
      for (let col = 0; col < BRICK_COLS; col++) {
        bricks.push({
          x: startX + col * (BRICK_WIDTH + BRICK_PADDING),
          y: 40 + row * (BRICK_HEIGHT + BRICK_PADDING),
          alive: true,
          color: BRICK_COLORS[row],
        });
      }
    }
    bricksRef.current = bricks;
  }, []);

  const startGame = useCallback(() => {
    setScore(0);
    setLives(3);
    setLevel(1);
    paddleRef.current.x = CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2;
    ballRef.current = {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT - 50,
      vx: (Math.random() > 0.5 ? 1 : -1) * 3,
      vy: -3,
    };
    initBricks();
    setGameState('playing');
  }, [initBricks]);

  // Mouse/touch control for paddle
  useEffect(() => {
    if (gameState !== 'playing') return;

    const handleMove = (clientX: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * CANVAS_WIDTH;
      paddleRef.current.x = Math.max(0, Math.min(CANVAS_WIDTH - PADDLE_WIDTH, x - PADDLE_WIDTH / 2));
    };

    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      handleMove(e.touches[0].clientX);
    };

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('mousemove', handleMouseMove);
      canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    }

    return () => {
      if (canvas) {
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('touchmove', handleTouchMove);
      }
    };
  }, [gameState]);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const update = () => {
      const ball = ballRef.current;
      const paddle = paddleRef.current;
      const bricks = bricksRef.current;

      // Move ball
      ball.x += ball.vx;
      ball.y += ball.vy;

      // Wall collisions
      if (ball.x <= BALL_RADIUS || ball.x >= CANVAS_WIDTH - BALL_RADIUS) {
        ball.vx = -ball.vx;
        ball.x = Math.max(BALL_RADIUS, Math.min(CANVAS_WIDTH - BALL_RADIUS, ball.x));
      }
      if (ball.y <= BALL_RADIUS) {
        ball.vy = -ball.vy;
        ball.y = BALL_RADIUS;
      }

      // Paddle collision
      if (ball.y + BALL_RADIUS >= CANVAS_HEIGHT - 30 &&
        ball.y - BALL_RADIUS <= CANVAS_HEIGHT - 30 + PADDLE_HEIGHT &&
        ball.x >= paddle.x && ball.x <= paddle.x + PADDLE_WIDTH) {
        ball.vy = -Math.abs(ball.vy);
        // Add angle based on where ball hit paddle
        const hitPos = (ball.x - paddle.x) / PADDLE_WIDTH;
        ball.vx = (hitPos - 0.5) * 6;
        ball.y = CANVAS_HEIGHT - 30 - BALL_RADIUS;
      }

      // Ball lost
      if (ball.y > CANVAS_HEIGHT + 20) {
        setLives(prev => {
          const newLives = prev - 1;
          if (newLives <= 0) {
            setGameState('gameover');
            if (session && score > highScore) {
              fetch('/api/minigames/score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameType: 'breakout', score }),
              }).then(() => setHighScore(score));
            }
          } else {
            // Reset ball position
            ball.x = CANVAS_WIDTH / 2;
            ball.y = CANVAS_HEIGHT - 50;
            ball.vx = (Math.random() > 0.5 ? 1 : -1) * 3;
            ball.vy = -3;
          }
          return newLives;
        });
        return;
      }

      // Brick collisions
      let bricksHit = 0;
      bricks.forEach((brick, i) => {
        if (!brick.alive) return;

        if (ball.x + BALL_RADIUS > brick.x &&
          ball.x - BALL_RADIUS < brick.x + BRICK_WIDTH &&
          ball.y + BALL_RADIUS > brick.y &&
          ball.y - BALL_RADIUS < brick.y + BRICK_HEIGHT) {
          brick.alive = false;
          ball.vy = -ball.vy;
          bricksHit++;
          setScore(s => s + 10 * level);
        }
      });

      // Check win
      if (bricks.every(b => !b.alive)) {
        setLevel(l => l + 1);
        initBricks();
        ball.x = CANVAS_WIDTH / 2;
        ball.y = CANVAS_HEIGHT - 50;
        ball.vx = (Math.random() > 0.5 ? 1 : -1) * (3 + level * 0.5);
        ball.vy = -(3 + level * 0.5);
      }
    };

    const draw = () => {
      // Background
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Bricks
      bricksRef.current.forEach(brick => {
        if (brick.alive) {
          ctx.fillStyle = brick.color;
          ctx.fillRect(brick.x, brick.y, BRICK_WIDTH, BRICK_HEIGHT);
          ctx.strokeStyle = '#ffffff22';
          ctx.strokeRect(brick.x, brick.y, BRICK_WIDTH, BRICK_HEIGHT);
        }
      });

      // Paddle
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(paddleRef.current.x, CANVAS_HEIGHT - 30, PADDLE_WIDTH, PADDLE_HEIGHT);

      // Ball
      ctx.beginPath();
      ctx.arc(ballRef.current.x, ballRef.current.y, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    };

    const gameLoop = () => {
      update();
      draw();
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [gameState, level, initBricks, session, score, highScore]);

  return (
    <GameBoyContainer isPlaying={gameState === 'playing'} gameOver={gameState === 'gameover'}>
      <div className="w-full h-full flex flex-col bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between p-2 bg-black border-b border-gray-700">
          <div className="text-xs font-mono text-yellow-400">
            SCORE: {score}
          </div>
          <div className="text-xs text-blue-400">LV{level}</div>
          <div className="text-xs text-red-400">
            {'❤️'.repeat(lives)}
          </div>
        </div>

        {/* Game canvas */}
        <div className="flex-1 flex items-center justify-center relative">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="border border-gray-700"
          />

          {/* Menu overlay */}
          {gameState === 'menu' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/90">
              <div className="text-center">
                <div className="text-3xl mb-2">🧱</div>
                <h1 className="text-xl font-black text-blue-400 mb-2">BREAKOUT</h1>
                <p className="text-xs text-gray-500 mb-4">Move mouse/touch to control paddle</p>
                <button
                  onClick={startGame}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded"
                >
                  START
                </button>
                {highScore > 0 && (
                  <p className="text-xs text-yellow-400 mt-2">Best: {highScore}</p>
                )}
              </div>
            </div>
          )}

          {/* Game over overlay */}
          {gameState === 'gameover' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/90">
              <div className="text-center">
                <p className="text-red-500 font-black text-xl mb-2">GAME OVER</p>
                <p className="text-yellow-400 mb-1">Score: {score}</p>
                <p className="text-gray-500 text-xs mb-4">Level: {level}</p>
                {score > highScore && <p className="text-green-400 text-sm mb-2">NEW HIGH SCORE!</p>}
                <button
                  onClick={startGame}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded"
                >
                  PLAY AGAIN
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </GameBoyContainer>
  );
}
