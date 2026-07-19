'use client';

import { ReactNode, useState, useRef, useEffect, useCallback } from 'react';
import { X, Minus, Square, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence, useDragControls } from 'motion/react';

interface WindowContainerProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  onClose?: () => void;
  accentColor?: string;
  defaultMinimized?: boolean;
  className?: string;
}

// Utility to adjust color brightness
function adjustColor(color: string, amount: number): string {
  const hex = color.replace('#', '');
  const num = parseInt(hex, 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
  return `#${(0x1000000 + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export function WindowContainer({
  title,
  icon,
  children,
  onClose,
  accentColor = '#ec4899', // Default pink
  defaultMinimized = false,
  className = ''
}: WindowContainerProps) {
  const [isMinimized, setIsMinimized] = useState(defaultMinimized);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -20 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`bg-white dark:bg-gray-900 border-4 border-black dark:border-white overflow-hidden transition-shadow duration-300 ${className}`}
      style={{
        boxShadow: isHovered
          ? '12px 12px 0px rgba(0, 0, 0, 0.9)'
          : '8px 8px 0px rgba(0, 0, 0, 0.8)',
        fontFamily: 'VT323, monospace',
      }}
    >
      {/* Window Header - Gradient with accent color */}
      <div
        className="px-3 py-2 flex justify-between items-center select-none transition-all duration-300"
        style={{
          background: `linear-gradient(135deg, ${accentColor} 0%, ${adjustColor(accentColor, -40)} 100%)`,
          borderBottom: '4px solid black',
        }}
      >
        <div className="flex items-center gap-2 text-white font-black text-sm">
          {icon && (
            <span className="flex items-center justify-center w-5 h-5 opacity-90">
              {icon}
            </span>
          )}
          <span style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.3)' }}>{title}</span>
        </div>

        {/* Window Controls */}
        <div className="flex gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="w-5 h-5 flex items-center justify-center bg-yellow-400 border-2 border-black hover:bg-yellow-500 transition-all duration-200 hover:scale-110"
            title={isMinimized ? "Expand" : "Minimize"}
            aria-label={isMinimized ? "Expand window" : "Minimize window"}
          >
            {isMinimized ? <ChevronDown size={12} className="text-black" /> : <Minus size={12} className="text-black" />}
          </button>
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="w-5 h-5 flex items-center justify-center bg-green-400 border-2 border-black hover:bg-green-500 transition-all duration-200 hover:scale-110"
            title={isMaximized ? "Restore" : "Maximize"}
            aria-label={isMaximized ? "Restore window size" : "Maximize window"}
          >
            <Square size={10} className="text-black" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="w-5 h-5 flex items-center justify-center bg-red-500 border-2 border-black hover:bg-red-600 transition-all duration-200 hover:scale-110"
              title="Close"
              aria-label="Close window"
            >
              <X size={12} className="text-white" />
            </button>
          )}
        </div>
      </div>

      {/* Window Content with Animation */}
      <AnimatePresence initial={false}>
        {!isMinimized && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div
              className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 text-black dark:text-white p-4"
              style={{
                maxHeight: isMaximized ? '70vh' : '400px',
                overflowY: 'auto',
                overflowX: 'hidden',
                scrollbarWidth: 'thin',
                fontFamily: 'VT323, monospace',
              }}
            >
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Minimized indicator */}
      {isMinimized && (
        <div className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-xs text-center text-gray-500 dark:text-gray-400 font-bold">
          Click minimize button to expand
        </div>
      )}
    </motion.div>
  );
}
