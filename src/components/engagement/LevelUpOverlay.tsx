'use client';

import { motion, AnimatePresence } from 'motion/react';
import { Star, X } from 'lucide-react';
import { useState, useEffect } from 'react';

interface LevelUpProps {
  newLevel: number;
  onClose: () => void;
  isOpen: boolean;
  rewards?: {
    coins?: number;
    badge?: string;
    crate?: string;
  };
}

export function LevelUpOverlay({ newLevel, onClose, isOpen, rewards }: LevelUpProps) {
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      // Hide confetti after animation
      const timer = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md"
        onClick={onClose}
      >
        {/* Confetti Effect (CSS-based) */}
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {Array.from({ length: 50 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  x: '50%', 
                  y: '50%', 
                  rotate: 0,
                  scale: 0,
                  opacity: 1
                }}
                animate={{ 
                  x: `${50 + (Math.random() - 0.5) * 200}%`,
                  y: `${50 + (Math.random() - 0.5) * 200}%`,
                  rotate: Math.random() * 360,
                  scale: [0, 1, 0],
                  opacity: [1, 1, 0]
                }}
                transition={{ 
                  duration: 2 + Math.random(),
                  delay: Math.random() * 0.5,
                  ease: "easeOut"
                }}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#95E1D3', '#F38181'][Math.floor(Math.random() * 5)]
                }}
              />
            ))}
          </div>
        )}
        
        <motion.div 
          initial={{ scale: 0.5, y: 100 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className="relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Burst Background */}
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute inset-[-150px] z-0 opacity-50"
            style={{ 
              background: 'conic-gradient(from 0deg, transparent 0deg, gold 20deg, transparent 40deg, gold 60deg, transparent 80deg, gold 100deg, transparent 120deg)' 
            }}
          />

          <div className="relative z-10 flex flex-col items-center">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
              className="text-yellow-400 font-black text-6xl drop-shadow-[0_0_20px_rgba(255,215,0,0.5)] animate-bounce"
            >
              LEVEL UP!
            </motion.div>
            
            <motion.div 
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", bounce: 0.5, delay: 0.4 }}
              className="mt-8 w-32 h-32 bg-gradient-to-br from-yellow-300 to-orange-500 rounded-2xl rotate-3 shadow-2xl flex items-center justify-center border-4 border-white"
            >
               <span className="text-8xl font-black text-white">{newLevel}</span>
            </motion.div>

            {rewards && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="mt-8 text-center text-white"
              >
                <p className="text-xl font-bold opacity-80">Rewards Unlocked:</p>
                <div className="flex gap-4 mt-2 justify-center">
                  {rewards.coins && (
                    <div className="px-4 py-2 bg-white/10 rounded-lg border border-white/20 backdrop-blur-md">
                      +{rewards.coins} Coins
                    </div>
                  )}
                  {rewards.badge && (
                    <div className="px-4 py-2 bg-white/10 rounded-lg border border-white/20 backdrop-blur-md">
                      {rewards.badge}
                    </div>
                  )}
                  {rewards.crate && (
                    <div className="px-4 py-2 bg-white/10 rounded-lg border border-white/20 backdrop-blur-md">
                      {rewards.crate} Crate
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            <motion.button 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              onClick={onClose}
              className="mt-12 px-8 py-3 bg-white text-black font-black text-xl rounded-full hover:scale-110 transition-transform shadow-[0_0_30px_white]"
            >
              CONTINUE
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

