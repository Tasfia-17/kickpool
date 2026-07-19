'use client';

import { motion } from 'motion/react';
import PixelIcon from '@/components/PixelIcon';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export function LoadingSpinner({ size = 'md', text, className = '' }: LoadingSpinnerProps) {
  const sizes = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
  };

  const iconSizes = {
    sm: 12,
    md: 16,
    lg: 24,
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div className={`relative ${sizes[size]}`}>
        {/* Outer ring */}
        <motion.div
          className="absolute inset-0 rounded-full border-4 border-purple-500/30"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        />
        {/* Inner spinning ring */}
        <motion.div
          className="absolute inset-0 rounded-full border-4 border-transparent border-t-pink-500"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
        {/* Pixel cat center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.span
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{ color: '#ff69b4' }}
          >
            <PixelIcon name="cat" size={iconSizes[size]} />
          </motion.span>
        </div>
      </div>
      {text && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-purple-300 font-medium"
        >
          {text}
        </motion.p>
      )}
    </div>
  );
}

// Dot loading animation
export function LoadingDots({ className = '' }: { className?: string }) {
  return (
    <div className={`flex gap-1 ${className}`}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 bg-purple-400 rounded-full"
          animate={{ y: [-4, 4, -4] }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
          }}
        />
      ))}
    </div>
  );
}

// Pulsing cat loader
export function CatLoader({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          rotate: [0, 5, -5, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="mb-4"
        style={{ color: '#ff69b4' }}
      >
        <PixelIcon name="cat" size={64} />
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center gap-2"
      >
        <span className="text-purple-300">{message}</span>
        <LoadingDots />
      </motion.div>
    </div>
  );
}

// Progress bar loader
export function ProgressLoader({ progress = 0 }: { progress: number }) {
  return (
    <div className="w-full max-w-xs">
      <div className="h-2 bg-purple-900/50 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-pink-500 to-purple-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
      <p className="text-center text-sm text-purple-300 mt-2">{progress}%</p>
    </div>
  );
}

// Skeleton pulse animation
export function SkeletonPulse({ className = '' }: { className?: string }) {
  return (
    <motion.div
      className={`bg-purple-800/40 rounded ${className}`}
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity }}
    />
  );
}
