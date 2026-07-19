'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSession } from 'next-auth/react';
import { io, Socket } from 'socket.io-client';
import { Wifi, Copy, Ship, Target, RefreshCw, Check } from 'lucide-react';
import { GameBoyContainer } from './GameBoyContainer';

type Cell = 'empty' | 'ship' | 'hit' | 'miss';
type Board = Cell[][];
type Ship = { size: number; name: string; placed: boolean };

const GRID_SIZE = 8;
const SHIPS: Ship[] = [
  { size: 4, name: 'Battleship', placed: false },
  { size: 3, name: 'Cruiser', placed: false },
  { size: 2, name: 'Destroyer', placed: false },
  { size: 2, name: 'Submarine', placed: false },
];

export function MultiplayerBattleship() {
  const { data: session } = useSession();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [myBoard, setMyBoard] = useState<Board>(createEmptyBoard());
  const [enemyBoard, setEnemyBoard] = useState<Board>(createEmptyBoard());
  const [ships, setShips] = useState<Ship[]>(SHIPS.map(s => ({ ...s })));
  const [currentShipIndex, setCurrentShipIndex] = useState(0);
  const [isHorizontal, setIsHorizontal] = useState(true);
  const [gameId, setGameId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Array<{ id: string; name: string }>>([]);
  const [isHost, setIsHost] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [status, setStatus] = useState<'LOBBY' | 'PLACING' | 'WAITING' | 'PLAYING' | 'WIN' | 'LOSE'>('LOBBY');
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [myReady, setMyReady] = useState(false);
  const [enemyReady, setEnemyReady] = useState(false);
  const [lastShot, setLastShot] = useState<{ row: number; col: number; hit: boolean } | null>(null);

  function createEmptyBoard(): Board {
    return Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill('empty'));
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
      console.log('[Battleship] game:created received:', { gameId, initialPlayers });
      setGameId(gameId);
      setInviteCode(gameId);
      setIsHost(true);
      setStatus('LOBBY');
      // Set initial players if provided (host should see themselves)
      if (initialPlayers && initialPlayers.length > 0) {
        console.log('[Battleship] Setting initial players:', initialPlayers);
        setPlayers(initialPlayers);
      }
    });

    newSocket.on('game:player_joined', ({ players: newPlayers }: { players: Array<{ id: string; name: string }> }) => {
      console.log('[Battleship] game:player_joined received:', newPlayers);
      setPlayers(newPlayers);
      if (newPlayers.length === 2) {
        setStatus('PLACING');
      }
    });

    newSocket.on('game:move_received', ({ move, from }: { move: any; from: { id: string; name: string } }) => {
      const userId = (session.user as any)?.id || session.user?.name || session.user?.email;
      
      if (move.type === 'ready') {
        if (from.id !== userId) {
          setEnemyReady(true);
          if (myReady) {
            setStatus('PLAYING');
            setIsMyTurn(isHost);
          }
        }
      } else if (move.type === 'shot') {
        if (from.id !== userId) {
          // Enemy shot at my board
          const { row, col } = move;
          const newBoard = myBoard.map(r => [...r]);
          const isHit = newBoard[row][col] === 'ship';
          newBoard[row][col] = isHit ? 'hit' : 'miss';
          setMyBoard(newBoard);
          
          // Check if all my ships sunk
          const hasShipsLeft = newBoard.some(r => r.some(c => c === 'ship'));
          if (!hasShipsLeft) {
            setStatus('LOSE');
          }
          
          setIsMyTurn(true);
          
          // Send result back
          newSocket.emit('game:move', {
            gameId,
            move: { type: 'shot_result', row, col, hit: isHit, sunk: !hasShipsLeft },
            user: { id: userId, name: session?.user?.name },
          });
        }
      } else if (move.type === 'shot_result') {
        if (from.id !== userId) {
          const { row, col, hit, sunk } = move;
          const newBoard = enemyBoard.map(r => [...r]);
          newBoard[row][col] = hit ? 'hit' : 'miss';
          setEnemyBoard(newBoard);
          setLastShot({ row, col, hit });
          
          if (sunk) {
            setStatus('WIN');
          } else {
            setIsMyTurn(!hit); // If hit, go again
          }
        }
      }
    });

    newSocket.on('game:error', ({ message }: { message: string }) => {
      console.error('[Battleship] Game error:', message);
      alert(message);
    });

    newSocket.on('game:player_left', ({ players: newPlayers }: { players: Array<{ id: string; name: string }> }) => {
      console.log('[Battleship] game:player_left received:', newPlayers);
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
  }, [session, gameId, isHost, myBoard, enemyBoard, myReady]);

  const createGame = () => {
    if (!socket || !session) return;
    const userId = (session.user as any)?.id || session.user?.name || session.user?.email;
    const userName = session.user?.name || 'Guest';
    socket.emit('game:create', {
      gameType: 'battleship',
      user: { id: userId, name: userName },
    });
  };

  const joinGame = () => {
    if (!socket || !session || !inviteCode) return;
    const userId = (session.user as any)?.id || session.user?.name || session.user?.email;
    const userName = session.user?.name || 'Guest';
    console.log('[Battleship] Joining game:', { gameId: inviteCode, userId, userName });
    socket.emit('game:join', {
      gameId: inviteCode.trim(), // Trim whitespace
      user: { id: userId, name: userName },
    });
    setGameId(inviteCode.trim());
  };

  const canPlaceShip = (row: number, col: number): boolean => {
    if (currentShipIndex >= ships.length) return false;
    const ship = ships[currentShipIndex];
    
    for (let i = 0; i < ship.size; i++) {
      const r = isHorizontal ? row : row + i;
      const c = isHorizontal ? col + i : col;
      if (r >= GRID_SIZE || c >= GRID_SIZE || myBoard[r][c] !== 'empty') {
        return false;
      }
    }
    return true;
  };

  const placeShip = (row: number, col: number) => {
    if (!canPlaceShip(row, col)) return;
    
    const ship = ships[currentShipIndex];
    const newBoard = myBoard.map(r => [...r]);
    
    for (let i = 0; i < ship.size; i++) {
      const r = isHorizontal ? row : row + i;
      const c = isHorizontal ? col + i : col;
      newBoard[r][c] = 'ship';
    }
    
    setMyBoard(newBoard);
    const newShips = [...ships];
    newShips[currentShipIndex].placed = true;
    setShips(newShips);
    setCurrentShipIndex(currentShipIndex + 1);
  };

  const readyUp = () => {
    if (!socket || !gameId || !session) return;
    const userId = (session.user as any)?.id || session.user?.name || session.user?.email;
    
    setMyReady(true);
    setStatus('WAITING');
    
    socket.emit('game:move', {
      gameId,
      move: { type: 'ready' },
      user: { id: userId, name: session?.user?.name },
    });
    
    if (enemyReady) {
      setStatus('PLAYING');
      setIsMyTurn(isHost);
    }
  };

  const fireShot = (row: number, col: number) => {
    if (!socket || !gameId || !session || !isMyTurn || status !== 'PLAYING') return;
    if (enemyBoard[row][col] !== 'empty') return;
    
    const userId = (session.user as any)?.id || session.user?.name || session.user?.email;
    setIsMyTurn(false);
    
    socket.emit('game:move', {
      gameId,
      move: { type: 'shot', row, col },
      user: { id: userId, name: session?.user?.name },
    });
  };

  const copyInviteCode = () => {
    navigator.clipboard.writeText(gameId || inviteCode);
  };

  const resetGame = () => {
    setMyBoard(createEmptyBoard());
    setEnemyBoard(createEmptyBoard());
    setShips(SHIPS.map(s => ({ ...s })));
    setCurrentShipIndex(0);
    setStatus('PLACING');
    setMyReady(false);
    setEnemyReady(false);
    setIsMyTurn(false);
    setLastShot(null);
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
          <Ship className="w-8 h-8 mb-2" />
          <h2 className="text-lg font-black mb-4">BATTLESHIP</h2>
          <p className="text-[10px] text-center mb-4 opacity-70">Sink all enemy ships!</p>
          
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
            <button onClick={copyInviteCode} className="p-1 hover:bg-[#0f380f]/20 rounded">
              <Copy size={14} />
            </button>
          </div>
          
          <p className="text-[10px] opacity-70 text-center">Share this code with a friend!</p>
        </div>
      </GameBoyContainer>
    );
  }

  // Ship placement
  if (status === 'PLACING') {
    const allPlaced = ships.every(s => s.placed);
    
    return (
      <GameBoyContainer isPlaying={false} gameOver={false}>
        <div className="w-full h-full flex flex-col text-[#0f380f] p-2">
          <div className="text-center text-xs font-bold mb-2">
            {allPlaced ? 'Ready to battle!' : `Place ${ships[currentShipIndex]?.name} (${ships[currentShipIndex]?.size})`}
          </div>
          
          {/* Grid */}
          <div className="flex-1 flex items-center justify-center">
            <div className="bg-[#0f380f]/20 p-0.5 rounded">
              {myBoard.map((row, rowIdx) => (
                <div key={rowIdx} className="flex">
                  {row.map((cell, colIdx) => (
                    <motion.div
                      key={colIdx}
                      className={`w-4 h-4 m-px border border-[#0f380f]/30 cursor-pointer ${
                        cell === 'ship' ? 'bg-[#0f380f]' : 'bg-[#9ca04c]'
                      }`}
                      onClick={() => !allPlaced && placeShip(rowIdx, colIdx)}
                      whileHover={!allPlaced && canPlaceShip(rowIdx, colIdx) ? { scale: 1.1 } : undefined}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
          
          {/* Controls */}
          <div className="flex justify-between items-center mt-2">
            {!allPlaced && (
              <button
                onClick={() => setIsHorizontal(!isHorizontal)}
                className="text-[10px] px-2 py-1 border border-[#0f380f] hover:bg-[#0f380f] hover:text-[#9ca04c]"
              >
                {isHorizontal ? '→ Horizontal' : '↓ Vertical'}
              </button>
            )}
            
            {allPlaced && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={readyUp}
                className="w-full py-2 border-2 border-[#0f380f] text-[#0f380f] font-bold text-xs hover:bg-[#0f380f] hover:text-[#9ca04c] flex items-center justify-center gap-2"
              >
                <Check size={14} />
                READY!
              </motion.button>
            )}
          </div>
        </div>
      </GameBoyContainer>
    );
  }

  // Waiting for enemy
  if (status === 'WAITING') {
    return (
      <GameBoyContainer isPlaying={false} gameOver={false}>
        <div className="w-full h-full flex flex-col items-center justify-center text-[#0f380f] p-4">
          <Target className="w-8 h-8 mb-2 animate-pulse" />
          <h3 className="text-sm font-bold">Waiting for opponent...</h3>
        </div>
      </GameBoyContainer>
    );
  }

  // Game play
  return (
    <GameBoyContainer isPlaying={status === 'PLAYING'} gameOver={status === 'WIN' || status === 'LOSE'}>
      <div className="w-full h-full flex flex-col text-[#0f380f] p-1">
        <div className="text-center text-[10px] font-bold mb-1">
          {isMyTurn ? <span className="animate-pulse">YOUR TURN - FIRE!</span> : <span className="opacity-70">Enemy's turn...</span>}
        </div>
        
        {/* Enemy Board */}
        <div className="text-center text-[8px] opacity-70 mb-0.5">ENEMY WATERS</div>
        <div className="flex justify-center mb-1">
          <div className="bg-[#0f380f]/20 p-0.5 rounded">
            {enemyBoard.map((row, rowIdx) => (
              <div key={rowIdx} className="flex">
                {row.map((cell, colIdx) => (
                  <motion.div
                    key={colIdx}
                    className={`w-3 h-3 m-px border border-[#0f380f]/30 cursor-pointer ${
                      cell === 'hit' ? 'bg-red-500' : cell === 'miss' ? 'bg-blue-400' : 'bg-[#9ca04c]'
                    }`}
                    onClick={() => fireShot(rowIdx, colIdx)}
                    whileHover={isMyTurn && cell === 'empty' ? { scale: 1.2 } : undefined}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        
        {/* My Board */}
        <div className="text-center text-[8px] opacity-70 mb-0.5">YOUR FLEET</div>
        <div className="flex justify-center">
          <div className="bg-[#0f380f]/20 p-0.5 rounded">
            {myBoard.map((row, rowIdx) => (
              <div key={rowIdx} className="flex">
                {row.map((cell, colIdx) => (
                  <div
                    key={colIdx}
                    className={`w-3 h-3 m-px border border-[#0f380f]/30 ${
                      cell === 'ship' ? 'bg-[#0f380f]' : 
                      cell === 'hit' ? 'bg-red-500' : 
                      cell === 'miss' ? 'bg-blue-400' : 'bg-[#9ca04c]'
                    }`}
                  />
                ))}
              </div>
            ))}
          </div>
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
              {status === 'WIN' ? 'VICTORY!' : 'DEFEAT!'}
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
