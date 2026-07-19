'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { usePokemonTheme } from '@/components/PokemonThemeProvider';
import { useSession } from 'next-auth/react';
import { GameBoyContainer } from './GameBoyContainer';
import { RotateCcw, Battery, Camera, Lightbulb, Volume2, VolumeX } from 'lucide-react';

// Game Constants
const NIGHT_DURATION = 90; // 90 seconds per night (6 AM = survive time)
const POWER_DRAIN_BASE = 0.15; // Base power drain per second
const POWER_DRAIN_CAMERA = 0.3;
const POWER_DRAIN_LIGHT = 0.25;
const POWER_DRAIN_DOOR = 0.2;

// Animatronic types with different behaviors
interface Animatronic {
  id: string;
  name: string;
  emoji: string;
  location: number; // 0-5 locations (5 = office)
  aggression: number; // Movement speed/chance
  isActive: boolean;
}

// Camera locations
const LOCATIONS = [
  { id: 0, name: 'Show Stage', emoji: '🎭' },
  { id: 1, name: 'Dining Area', emoji: '🍕' },
  { id: 2, name: 'West Hall', emoji: '🚪' },
  { id: 3, name: 'East Hall', emoji: '🚪' },
  { id: 4, name: 'Left Door', emoji: '⬅️' },
  { id: 5, name: 'Right Door', emoji: '➡️' },
];

export function FNAFGame() {
  const { isDarkMode } = usePokemonTheme();
  const { data: session } = useSession();

  // Game State
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'jumpscare' | 'victory' | 'gameover'>('menu');
  const [night, setNight] = useState(1);
  const [time, setTime] = useState(0); // 0-90 seconds (12AM - 6AM)
  const [power, setPower] = useState(100);
  const [highestNight, setHighestNight] = useState(1);

  // Camera State
  const [cameraOpen, setCameraOpen] = useState(false);
  const [currentCamera, setCurrentCamera] = useState(0);
  const [cameraStatic, setCameraStatic] = useState(false);

  // Door/Light State
  const [leftDoor, setLeftDoor] = useState(false);
  const [rightDoor, setRightDoor] = useState(false);
  const [leftLight, setLeftLight] = useState(false);
  const [rightLight, setRightLight] = useState(false);

  // Animatronics
  const [animatronics, setAnimatronics] = useState<Animatronic[]>([]);
  const [jumpscareAnimatronic, setJumpscareAnimatronic] = useState<Animatronic | null>(null);

  // Audio State
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [ambientPlaying, setAmbientPlaying] = useState(false);

  // Visual Effects
  const [screenFlicker, setScreenFlicker] = useState(false);
  const [officeShake, setOfficeShake] = useState(false);

  // Refs for intervals
  const gameLoopRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const moveIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Initialize animatronics based on night
  const initAnimatronics = useCallback((nightNum: number) => {
    const baseAggression = Math.min(nightNum * 2, 15);
    return [
      { id: 'felix', name: 'Felix the Cat', emoji: '🐱', location: 0, aggression: baseAggression, isActive: true },
      { id: 'bonnie', name: 'Bonnie Bunny', emoji: '🐰', location: 0, aggression: baseAggression - 1, isActive: nightNum >= 1 },
      { id: 'chica', name: 'Chica Chicken', emoji: '🐔', location: 0, aggression: baseAggression - 2, isActive: nightNum >= 2 },
      { id: 'foxy', name: 'Foxy Fox', emoji: '🦊', location: 1, aggression: baseAggression + 2, isActive: nightNum >= 3 },
    ].filter(a => a.isActive);
  }, []);

  // Start new night
  const startNight = useCallback(() => {
    setTime(0);
    setPower(100);
    setCameraOpen(false);
    setLeftDoor(false);
    setRightDoor(false);
    setLeftLight(false);
    setRightLight(false);
    setAnimatronics(initAnimatronics(night));
    setGameState('playing');
    setAmbientPlaying(true);
  }, [night, initAnimatronics]);

  // Format game time (12AM - 6AM)
  const formatTime = (seconds: number) => {
    const hour = Math.floor((seconds / NIGHT_DURATION) * 6);
    if (hour === 0) return '12 AM';
    return `${hour} AM`;
  };

  // Handle jumpscare
  const triggerJumpscare = useCallback((animatronic: Animatronic) => {
    setJumpscareAnimatronic(animatronic);
    setGameState('jumpscare');
    setAmbientPlaying(false);
    setOfficeShake(true);

    setTimeout(() => {
      setGameState('gameover');
      setOfficeShake(false);
    }, 1500);
  }, []);

  // Move animatronics
  const moveAnimatronics = useCallback(() => {
    if (gameState !== 'playing') return;

    setAnimatronics(prev => {
      return prev.map(anim => {
        // Random chance to move based on aggression
        const moveChance = (anim.aggression + night * 2) / 100;
        if (Math.random() > moveChance) return anim;

        let newLocation = anim.location;

        // Special behavior for Foxy - rushes down hallway
        if (anim.id === 'foxy') {
          if (anim.location < 4) {
            newLocation = Math.min(anim.location + 1, 4);
          }
        } else {
          // Other animatronics move through locations
          if (anim.location === 0) {
            // From stage, go to dining
            newLocation = 1;
          } else if (anim.location === 1) {
            // From dining, go to left or right hall
            newLocation = Math.random() > 0.5 ? 2 : 3;
          } else if (anim.location === 2) {
            // From west hall, go to left door
            newLocation = 4;
          } else if (anim.location === 3) {
            // From east hall, go to right door
            newLocation = 5;
          }
        }

        // Camera static effect when animatronic moves
        if (newLocation !== anim.location && cameraOpen) {
          setCameraStatic(true);
          setTimeout(() => setCameraStatic(false), 300);
        }

        return { ...anim, location: newLocation };
      });
    });
  }, [gameState, night, cameraOpen]);

  // Check for attacks
  const checkAttacks = useCallback(() => {
    if (gameState !== 'playing') return;

    animatronics.forEach(anim => {
      // Check left door
      if (anim.location === 4 && !leftDoor && !cameraOpen) {
        const attackChance = anim.aggression / 50;
        if (Math.random() < attackChance) {
          triggerJumpscare(anim);
        }
      }
      // Check right door
      if (anim.location === 5 && !rightDoor && !cameraOpen) {
        const attackChance = anim.aggression / 50;
        if (Math.random() < attackChance) {
          triggerJumpscare(anim);
        }
      }
    });
  }, [gameState, animatronics, leftDoor, rightDoor, cameraOpen, triggerJumpscare]);

  // Main game loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    gameLoopRef.current = setInterval(() => {
      // Update time
      setTime(prev => {
        const newTime = prev + 1;
        if (newTime >= NIGHT_DURATION) {
          // Survived the night!
          setGameState('victory');
          setAmbientPlaying(false);
          if (night >= highestNight) {
            setHighestNight(night + 1);
            // Save high score
            if (session) {
              const controller = new AbortController();
              fetch('/api/minigames/score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameType: 'fnaf', score: night * 1000 }),
                signal: controller.signal
              }).catch((error) => {
                if (error.name !== 'AbortError') console.error('Failed to save high score:', error);
              });
            }
          }
          return NIGHT_DURATION;
        }
        return newTime;
      });

      // Drain power
      setPower(prev => {
        let drain = POWER_DRAIN_BASE;
        if (cameraOpen) drain += POWER_DRAIN_CAMERA;
        if (leftLight) drain += POWER_DRAIN_LIGHT;
        if (rightLight) drain += POWER_DRAIN_LIGHT;
        if (leftDoor) drain += POWER_DRAIN_DOOR;
        if (rightDoor) drain += POWER_DRAIN_DOOR;

        const newPower = prev - drain;
        if (newPower <= 0) {
          // Power out - vulnerable!
          setLeftDoor(false);
          setRightDoor(false);
          setLeftLight(false);
          setRightLight(false);
          setCameraOpen(false);

          // High chance of attack when power is out
          setTimeout(() => {
            if (gameState === 'playing') {
              const attacker = animatronics.find(a => a.location >= 4);
              if (attacker) {
                triggerJumpscare(attacker);
              }
            }
          }, 2000);
          return 0;
        }
        return newPower;
      });

      // Random screen flicker for atmosphere
      if (Math.random() < 0.02) {
        setScreenFlicker(true);
        setTimeout(() => setScreenFlicker(false), 100);
      }
    }, 1000);

    // Animatronic movement interval
    moveIntervalRef.current = setInterval(() => {
      moveAnimatronics();
      checkAttacks();
    }, 3000);

    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
      if (moveIntervalRef.current) clearInterval(moveIntervalRef.current);
    };
  }, [gameState, cameraOpen, leftLight, rightLight, leftDoor, rightDoor, night, session, highestNight, animatronics, moveAnimatronics, checkAttacks, triggerJumpscare]);

  // Get animatronics at current camera location
  const getAnimatronicsAtLocation = (locationId: number) => {
    return animatronics.filter(a => a.location === locationId);
  };

  // Check if animatronic is at door
  const isAtLeftDoor = animatronics.some(a => a.location === 4);
  const isAtRightDoor = animatronics.some(a => a.location === 5);

  return (
    <GameBoyContainer isPlaying={gameState === 'playing'} gameOver={gameState === 'gameover'}>
      <div className={`relative w-full h-full overflow-hidden transition-all duration-100 ${officeShake ? 'animate-shake' : ''}`}>
        {/* Menu Screen */}
        <AnimatePresence>
          {gameState === 'menu' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black p-4 text-center"
            >
              <div className="text-6xl mb-4 animate-pulse">🐱</div>
              <h1 className="text-xl font-bold text-red-500 mb-2" style={{ fontFamily: 'monospace', textShadow: '0 0 10px #ff0000' }}>
                FIVE NIGHTS
              </h1>
              <h2 className="text-lg font-bold text-red-400 mb-4" style={{ fontFamily: 'monospace' }}>
                AT CINEPURR
              </h2>

              <div className="text-xs text-gray-500 mb-4 max-w-[200px]">
                Survive 5 nights at CinePurr's haunted cinema. Watch the cameras. Close the doors. Don't run out of power.
              </div>

              <div className="text-sm text-yellow-500 mb-4">Night {night}</div>
              <div className="text-xs text-gray-600 mb-4">Best: Night {highestNight}</div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={startNight}
                className="px-6 py-2 bg-red-600 text-white font-bold rounded hover:bg-red-700 transition-colors"
                style={{ fontFamily: 'monospace' }}
              >
                START NIGHT
              </motion.button>

              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="mt-4 text-gray-500 hover:text-gray-400"
              >
                {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Game Screen */}
        {gameState === 'playing' && (
          <div className={`relative w-full h-full bg-gray-900 ${screenFlicker ? 'opacity-50' : ''}`}>
            {/* Top HUD */}
            <div className="absolute top-0 left-0 right-0 flex justify-between items-center p-2 bg-black/50 z-20">
              <div className="flex items-center gap-2">
                <Battery size={14} className={power < 20 ? 'text-red-500 animate-pulse' : 'text-green-500'} />
                <span className={`text-xs font-mono ${power < 20 ? 'text-red-500' : 'text-green-400'}`}>
                  {Math.floor(power)}%
                </span>
              </div>
              <div className="text-xs font-mono text-white">
                Night {night}
              </div>
              <div className="text-xs font-mono text-yellow-400">
                {formatTime(time)}
              </div>
            </div>

            {/* Camera View */}
            {cameraOpen ? (
              <div className="absolute inset-0 pt-8 pb-16">
                {/* Camera static overlay */}
                {cameraStatic && (
                  <div className="absolute inset-0 bg-white/20 z-30 animate-pulse"
                    style={{
                      backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
                      mixBlendMode: 'overlay'
                    }}
                  />
                )}

                {/* Camera feed */}
                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-800 p-4">
                  <div className="text-3xl mb-2">{LOCATIONS[currentCamera].emoji}</div>
                  <div className="text-sm font-mono text-green-400 mb-4">
                    CAM {currentCamera + 1}: {LOCATIONS[currentCamera].name}
                  </div>

                  {/* Animatronics at this location */}
                  <div className="flex gap-2 mb-4 min-h-[60px]">
                    {getAnimatronicsAtLocation(currentCamera).map(anim => (
                      <motion.div
                        key={anim.id}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-4xl"
                        style={{ filter: 'drop-shadow(0 0 10px #ff0000)' }}
                      >
                        {anim.emoji}
                      </motion.div>
                    ))}
                    {getAnimatronicsAtLocation(currentCamera).length === 0 && (
                      <div className="text-gray-600 text-xs">Empty</div>
                    )}
                  </div>

                  {/* Camera selector */}
                  <div className="grid grid-cols-3 gap-1">
                    {LOCATIONS.slice(0, 4).map(loc => (
                      <button
                        key={loc.id}
                        onClick={() => {
                          setCameraStatic(true);
                          setTimeout(() => {
                            setCurrentCamera(loc.id);
                            setCameraStatic(false);
                          }, 150);
                        }}
                        className={`px-2 py-1 text-xs font-mono transition-colors ${
                          currentCamera === loc.id
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {loc.name.slice(0, 5)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Close camera button */}
                <button
                  onClick={() => setCameraOpen(false)}
                  className="absolute bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 bg-red-600 text-white font-mono text-xs hover:bg-red-700"
                >
                  CLOSE CAMERA
                </button>
              </div>
            ) : (
              /* Office View */
              <div className="absolute inset-0 pt-8 pb-16 flex flex-col">
                {/* Office background */}
                <div className="flex-1 relative bg-gradient-to-b from-gray-800 to-gray-900 flex items-center justify-center">
                  <div className="text-6xl opacity-20">🎬</div>

                  {/* Left door area */}
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
                    <button
                      onClick={() => setLeftLight(!leftLight)}
                      disabled={power <= 0}
                      className={`p-2 rounded transition-colors ${
                        leftLight ? 'bg-yellow-500' : 'bg-gray-700 hover:bg-gray-600'
                      } ${power <= 0 ? 'opacity-50' : ''}`}
                    >
                      <Lightbulb size={16} className={leftLight ? 'text-white' : 'text-gray-400'} />
                    </button>
                    <button
                      onClick={() => setLeftDoor(!leftDoor)}
                      disabled={power <= 0}
                      className={`px-2 py-4 font-mono text-xs transition-colors ${
                        leftDoor ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                      } ${power <= 0 ? 'opacity-50' : ''}`}
                    >
                      {leftDoor ? '🔒' : '🚪'}
                    </button>

                    {/* Show animatronic at door when light is on */}
                    {leftLight && isAtLeftDoor && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute left-8 text-4xl"
                        style={{ filter: 'drop-shadow(0 0 20px #ff0000)' }}
                      >
                        {animatronics.find(a => a.location === 4)?.emoji}
                      </motion.div>
                    )}
                  </div>

                  {/* Right door area */}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
                    <button
                      onClick={() => setRightLight(!rightLight)}
                      disabled={power <= 0}
                      className={`p-2 rounded transition-colors ${
                        rightLight ? 'bg-yellow-500' : 'bg-gray-700 hover:bg-gray-600'
                      } ${power <= 0 ? 'opacity-50' : ''}`}
                    >
                      <Lightbulb size={16} className={rightLight ? 'text-white' : 'text-gray-400'} />
                    </button>
                    <button
                      onClick={() => setRightDoor(!rightDoor)}
                      disabled={power <= 0}
                      className={`px-2 py-4 font-mono text-xs transition-colors ${
                        rightDoor ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                      } ${power <= 0 ? 'opacity-50' : ''}`}
                    >
                      {rightDoor ? '🔒' : '🚪'}
                    </button>

                    {/* Show animatronic at door when light is on */}
                    {rightLight && isAtRightDoor && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute right-8 text-4xl"
                        style={{ filter: 'drop-shadow(0 0 20px #ff0000)' }}
                      >
                        {animatronics.find(a => a.location === 5)?.emoji}
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Open camera button */}
                <button
                  onClick={() => setCameraOpen(true)}
                  disabled={power <= 0}
                  className={`absolute bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 bg-gray-700 text-white font-mono text-xs hover:bg-gray-600 flex items-center gap-2 ${power <= 0 ? 'opacity-50' : ''}`}
                >
                  <Camera size={14} />
                  OPEN CAMERA
                </button>
              </div>
            )}

            {/* Power out overlay */}
            {power <= 0 && (
              <div className="absolute inset-0 bg-black z-40 flex items-center justify-center">
                <div className="text-red-500 font-mono text-xs animate-pulse">POWER OUT...</div>
              </div>
            )}
          </div>
        )}

        {/* Jumpscare Screen */}
        <AnimatePresence>
          {gameState === 'jumpscare' && jumpscareAnimatronic && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1.2, opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black flex items-center justify-center z-50"
            >
              <motion.div
                animate={{
                  x: [0, -10, 10, -10, 10, 0],
                  rotate: [0, -5, 5, -5, 5, 0]
                }}
                transition={{ duration: 0.3, repeat: 3 }}
                className="text-8xl"
                style={{
                  filter: 'drop-shadow(0 0 30px #ff0000) brightness(1.5)',
                  transform: 'scale(1.5)'
                }}
              >
                {jumpscareAnimatronic.emoji}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Game Over Screen */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 bg-black flex flex-col items-center justify-center p-4 z-50">
            <div className="text-4xl mb-4">💀</div>
            <h2 className="text-xl font-bold text-red-500 mb-2" style={{ fontFamily: 'monospace' }}>
              GAME OVER
            </h2>
            <div className="text-xs text-gray-500 mb-4">
              {jumpscareAnimatronic?.name} got you!
            </div>
            <div className="text-sm text-gray-400 mb-4">Night {night}</div>

            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setNight(1);
                  setGameState('menu');
                }}
                className="px-4 py-2 bg-gray-700 text-white font-mono text-xs hover:bg-gray-600"
              >
                RESTART
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={startNight}
                className="px-4 py-2 bg-red-600 text-white font-mono text-xs hover:bg-red-700"
              >
                RETRY NIGHT
              </motion.button>
            </div>
          </div>
        )}

        {/* Victory Screen */}
        {gameState === 'victory' && (
          <div className="absolute inset-0 bg-black flex flex-col items-center justify-center p-4 z-50">
            <div className="text-4xl mb-4">🎉</div>
            <h2 className="text-xl font-bold text-green-500 mb-2" style={{ fontFamily: 'monospace' }}>
              6 AM - YOU SURVIVED!
            </h2>
            <div className="text-sm text-yellow-400 mb-4">Night {night} Complete!</div>
            <div className="text-xs text-gray-500 mb-4">
              +{night * 1000} points
            </div>

            {night < 5 ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setNight(prev => prev + 1);
                  setGameState('menu');
                }}
                className="px-6 py-2 bg-green-600 text-white font-bold rounded hover:bg-green-700 transition-colors"
                style={{ fontFamily: 'monospace' }}
              >
                NIGHT {night + 1} →
              </motion.button>
            ) : (
              <div>
                <div className="text-lg font-bold text-yellow-400 mb-4" style={{ fontFamily: 'monospace' }}>
                  🏆 ALL NIGHTS COMPLETE! 🏆
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setNight(1);
                    setGameState('menu');
                  }}
                  className="px-6 py-2 bg-yellow-600 text-white font-bold rounded hover:bg-yellow-700 transition-colors"
                  style={{ fontFamily: 'monospace' }}
                >
                  PLAY AGAIN
                </motion.button>
              </div>
            )}
          </div>
        )}

        {/* Bottom Controls Info */}
        {gameState === 'playing' && (
          <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-2 flex justify-around text-xs text-gray-500 font-mono z-20">
            <div className={leftDoor ? 'text-red-400' : ''}>L-DOOR: {leftDoor ? 'CLOSED' : 'OPEN'}</div>
            <div className={rightDoor ? 'text-red-400' : ''}>R-DOOR: {rightDoor ? 'CLOSED' : 'OPEN'}</div>
          </div>
        )}
      </div>

      {/* Shake animation style */}
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out infinite;
        }
      `}</style>
    </GameBoyContainer>
  );
}
