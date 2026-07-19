'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSession } from 'next-auth/react';
import { Zap, AlertTriangle, Trophy } from 'lucide-react';
import { GameBoyContainer } from './GameBoyContainer';

type State = 'IDLE' | 'WAITING' | 'READY' | 'TOO_EARLY' | 'RESULT';

export function ReactionGame() {
  const { data: session } = useSession();
  const [state, setState] = useState<State>('IDLE');
  const [time, setTime] = useState(0);
  const [bestScore, setBestScore] = useState<number | null>(null);
  const [personalHighScore, setPersonalHighScore] = useState(0);
  const [globalLeader, setGlobalLeader] = useState<{ score: number; username: string } | null>(null);
  const [showLeaderModal, setShowLeaderModal] = useState(false);

  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    const controller = new AbortController();
    if (session) {
      fetchHighScore(controller.signal);
    }
    return () => controller.abort();
  }, [session]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const fetchHighScore = async (signal?: AbortSignal) => {
    try {
      const res = await fetch('/api/minigames/score?gameType=reaction&global=true', { signal });
      if (res.ok) {
        const data = await res.json();
        setPersonalHighScore(data.highScore || 0);
        if (data.highScore) {
          setBestScore(data.highScore);
        }
        if (data.globalLeader) {
          setGlobalLeader(data.globalLeader);
        }
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      console.error('Failed to fetch high score:', error);
    }
  };

  const startGame = () => {
    setState('WAITING');
    const randomDelay = 2000 + Math.random() * 3000; // 2-5 seconds

    timeoutRef.current = setTimeout(() => {
      startTimeRef.current = Date.now();
      setState('READY');
    }, randomDelay);
  };

  const handleInteraction = async () => {
    if (state === 'IDLE' || state === 'RESULT' || state === 'TOO_EARLY') {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      startGame();
    } else if (state === 'WAITING') {
      // FALSE START
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setState('TOO_EARLY');
    } else if (state === 'READY') {
      // SUCCESS
      const endTime = Date.now();
      const reaction = endTime - startTimeRef.current;
      setTime(reaction);
      if (!bestScore || reaction < bestScore) {
        setBestScore(reaction);
        // Save high score
        if (session) {
          try {
            await fetch('/api/minigames/score', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ gameType: 'reaction', score: reaction }),
            });
            setPersonalHighScore(reaction);
          } catch (error) {
            console.error('Failed to save score:', error);
          }
        }
      }
      setState('RESULT');
    }
  };

  // Determine background color and text based on state
  const getTheme = () => {
    switch(state) {
      case 'WAITING': return 'bg-red-500';
      case 'READY': return 'bg-green-500';
      case 'TOO_EARLY': return 'bg-yellow-500';
      case 'RESULT': return 'bg-blue-600';
      default: return 'bg-transparent';
    }
  };

  const isPlaying = state === 'WAITING' || state === 'READY';
  const gameOver = state === 'RESULT' || state === 'TOO_EARLY';

  return (
    <GameBoyContainer isPlaying={isPlaying} gameOver={gameOver}>
      <div
        className={`w-full h-full flex flex-col items-center justify-center text-[#0f380f] transition-colors duration-0 ${getTheme()}`}
        onPointerDown={handleInteraction}
      >
        <AnimatePresence mode="wait">
          {state === 'IDLE' && (
             <motion.div key="idle" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
               <Zap size={32} className="mx-auto mb-2 animate-pulse" />
               <h2 className="text-xl font-black">QUICK DRAW</h2>
               <p className="opacity-70 mt-2 text-xs font-mono">Click to start</p>
             </motion.div>
          )}

          {state === 'WAITING' && (
             <motion.div key="waiting" className="text-center">
               <div className="text-3xl font-black tracking-widest opacity-50">...</div>
               <p className="font-bold text-sm mt-2">WAIT FOR GREEN</p>
             </motion.div>
          )}

          {state === 'READY' && (
             <motion.div key="ready" className="text-center scale-125">
               <h1 className="text-4xl font-black">CLICK!</h1>
             </motion.div>
          )}

          {state === 'TOO_EARLY' && (
             <motion.div key="early" initial={{ x: -10 }} animate={{ x: [10, -10, 10, 0] }} className="text-center">
               <AlertTriangle size={32} className="mx-auto mb-2" />
               <h2 className="text-lg font-bold">TOO EARLY!</h2>
               <p className="opacity-80 mt-1 text-xs">Click to try again</p>
             </motion.div>
          )}

          {state === 'RESULT' && (
             <motion.div key="result" initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-center">
               <div className="text-[10px] font-bold opacity-60 uppercase mb-1">Reaction Time</div>
               <h2 className="text-4xl font-black font-mono tracking-tighter mb-2">{time}ms</h2>
               {time < 200 && <div className="inline-block bg-yellow-400 text-black font-bold px-2 py-0.5 rotate-[-5deg] text-xs">GODLIKE!</div>}
               <p className="opacity-70 mt-4 text-xs">Click to play again</p>
             </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Score Board Outside Game Boy */}
      <div className="flex gap-6 font-mono text-xs font-bold shrink-0 mt-2">
        {bestScore && (
          <div className="flex flex-col items-center text-yellow-500">
            <span className="opacity-50 text-[9px]">BEST</span>
            <div className="flex items-center gap-1">
              <Trophy size={12} />
              <span className="text-base">{bestScore}ms</span>
            </div>
          </div>
        )}
        {globalLeader && (
          <button
            onClick={() => setShowLeaderModal(true)}
            className="flex flex-col items-center text-purple-500 hover:text-purple-400 transition-colors cursor-pointer"
            title="Click to see global leader"
          >
            <span className="opacity-50 text-[9px]">WORLD</span>
            <div className="flex items-center gap-1">
              <Trophy size={12} />
              <span className="text-base">{globalLeader.score}ms</span>
            </div>
          </button>
        )}
      </div>

      {/* Global Leader Modal */}
      {showLeaderModal && globalLeader && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowLeaderModal(false)}
        >
          <div
            className="bg-[#9ca04c] border-4 border-[#0f380f] rounded-lg p-6 max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-black text-[#0f380f] mb-4 text-center">🏆 WORLD RECORD</h3>
            <div className="text-center">
              <div className="text-3xl font-black text-purple-600 mb-2">{globalLeader.score}ms</div>
              <div className="text-lg font-bold text-[#0f380f]">by {globalLeader.username}</div>
            </div>
            <button
              onClick={() => setShowLeaderModal(false)}
              className="mt-6 w-full px-4 py-2 border-2 border-[#0f380f] text-[#0f380f] font-bold hover:bg-[#0f380f] hover:text-[#9ca04c] transition-colors"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </GameBoyContainer>
  );
}
