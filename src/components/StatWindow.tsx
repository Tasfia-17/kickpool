'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
import { X, Minus, Square, Maximize2 } from 'lucide-react';
import { usePokemonTheme } from '@/components/PokemonThemeProvider';
import { ReactNode } from 'react';

// Define window types for better defaults
type WindowType = 'game' | 'utility' | 'media';

interface StatWindowProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  icon?: ReactNode;
  zIndex?: number;
  onFocus?: () => void;
  windowType?: WindowType;
  width?: number;
  height?: number;
}

const DEFAULT_SIZES = {
  game: { width: 450, height: 600, resizable: false }, // Fixed size for games like Snake
  utility: { width: 500, height: 400, resizable: false }, // Fixed for feeds
  media: { width: 800, height: 500, resizable: false },
};

// Mobile sizes - smaller windows for mobile devices (calculated dynamically)
const getMobileSizes = (windowWidth: number, windowHeight: number) => ({
  game: {
    width: Math.min(350, windowWidth - 32),
    height: Math.min(500, windowHeight - 100),
    resizable: false
  },
  utility: {
    width: Math.min(320, windowWidth - 32),
    height: Math.min(400, windowHeight - 100),
    resizable: false
  },
  media: {
    width: Math.min(320, windowWidth - 32),
    height: Math.min(400, windowHeight - 100),
    resizable: false
  },
});

export function StatWindow({
  isOpen,
  onClose,
  title,
  children,
  icon,
  zIndex = 1000,
  onFocus,
  windowType = 'utility',
  width,
  height,
}: StatWindowProps) {
  const { isDarkMode, currentTheme } = usePokemonTheme();
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [windowDimensions, setWindowDimensions] = useState({ width: 0, height: 0 });

  // Detect mobile and window dimensions on mount
  useEffect(() => {
    const checkMobile = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setIsMobile(width < 640);
      setWindowDimensions({ width, height });
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize with correct size based on type and device
  // Custom width/height always takes precedence
  const baseConfig = isMobile && windowDimensions.width > 0 && !width && !height
    ? getMobileSizes(windowDimensions.width, windowDimensions.height)[windowType]
    : DEFAULT_SIZES[windowType];
  // Allow custom width/height to override defaults
  const config = {
    ...baseConfig,
    width: width || baseConfig.width,
    height: height || baseConfig.height,
  };
  const windowWidth = config.width;
  const windowHeight = config.height;

  const constraintsRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const positionRef = useRef({ x: 0, y: 0 });
  const dragStartRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setMounted(true);
    // Smart centering with slight random offset to prevent overlap
    if (typeof window !== 'undefined') {
      positionRef.current = {
        x: (window.innerWidth - windowWidth) / 2 + (Math.random() * 40 - 20),
        y: (window.innerHeight - windowHeight) / 2 + (Math.random() * 40 - 20)
      };
    }
  }, [windowWidth, windowHeight]);

  // Reset state when reopened
  useEffect(() => {
    if (isOpen) {
      setIsMinimized(false);
      setIsMaximized(false);
    }
  }, [isOpen]);

  const handleFocus = () => {
    if (onFocus) onFocus();
  };

  if (!isOpen || !mounted) return null;

  return (
    <AnimatePresence>
      {!isMinimized && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50"
            style={{ zIndex: zIndex - 1 }}
          />

          {/* Window */}
          <motion.div
            ref={constraintsRef}
            drag={!isMaximized && !isMobile}
            dragMomentum={false}
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{
              left: 0,
              right: typeof window !== 'undefined' ? window.innerWidth - windowWidth : 0,
              top: 0,
              bottom: typeof window !== 'undefined' ? window.innerHeight - windowHeight : 0,
            }}
            onDragStart={() => {
              if (!isMaximized && !isMobile) {
                dragStartRef.current = { ...positionRef.current };
              }
            }}
            onDrag={(e, info) => {
              if (!isMaximized && !isMobile) {
                const newX = dragStartRef.current.x + info.offset.x;
                const newY = dragStartRef.current.y + info.offset.y;

                const maxX = typeof window !== 'undefined' ? window.innerWidth - windowWidth : 0;
                const maxY = typeof window !== 'undefined' ? window.innerHeight - windowHeight : 0;

                positionRef.current = {
                  x: Math.max(0, Math.min(maxX, newX)),
                  y: Math.max(0, Math.min(maxY, newY))
                };
              }
            }}
            onClick={(e) => {
              e.stopPropagation();
              handleFocus();
            }}
            initial={{
              scale: isMobile ? 1 : 0,
              opacity: 0,
              x: isMobile ? 0 : (isMaximized ? 0 : positionRef.current.x),
              y: isMobile ? 'auto' : (isMaximized ? 0 : positionRef.current.y),
            }}
            animate={{
              scale: 1,
              opacity: 1,
              width: isMobile ? '100%' : (isMaximized ? '100vw' : `${windowWidth}px`),
              height: isMobile ? '85vh' : (isMaximized ? '100vh' : `${windowHeight}px`),
              x: isMobile ? 0 : (isMaximized ? 0 : positionRef.current.x),
              y: isMobile ? 'auto' : (isMaximized ? 0 : positionRef.current.y),
            }}
            exit={{
              scale: isMobile ? 1 : 0,
              opacity: 0,
              y: isMobile ? '100%' : 0,
              filter: isMobile ? 'none' : 'blur(10px)'
            }}
            transition={{
              type: "spring",
              stiffness: isMobile ? 400 : 300,
              damping: isMobile ? 35 : 28
            }}
            style={{
              zIndex,
              position: 'fixed',
              pointerEvents: 'auto',
              // Mobile: bottom sheet style
              ...(isMobile ? {
                bottom: 0,
                left: 0,
                right: 0,
                top: 'auto',
                borderRadius: '20px 20px 0 0',
                maxHeight: '85vh',
              } : {}),
            }}
            className={`
              flex flex-col
              ${isMobile
                ? 'shadow-[0_-4px_20px_rgba(0,0,0,0.2)]'
                : 'shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]'
              }
              ${isDarkMode ? 'bg-gray-900 border-2 border-white/50' : 'bg-white border-2 border-black'}
              ${isMaximized && !isMobile ? 'rounded-none' : ''}
              ${isMobile ? '' : 'rounded-lg'}
            `}
          >
            {/* Mobile drag indicator */}
            {isMobile && (
              <div className="flex justify-center py-2">
                <div className={`w-10 h-1 rounded-full ${isDarkMode ? 'bg-white/30' : 'bg-black/20'}`} />
              </div>
            )}

            {/* HEADER BAR */}
            <div
              className={`${isMobile ? 'h-12' : 'h-10'} border-b-2 border-inherit flex items-center justify-between px-3 ${isMobile ? '' : 'cursor-grab active:cursor-grabbing'}`}
              style={{
                backgroundColor: isDarkMode ? '#111' : '#eee',
                backgroundImage: isMobile ? 'none' : 'linear-gradient(135deg, rgba(0,0,0,0.05) 25%, transparent 25%, transparent 50%, rgba(0,0,0,0.05) 50%, rgba(0,0,0,0.05) 75%, transparent 75%, transparent)',
                backgroundSize: '20px 20px'
              }}
              onPointerDown={(e) => {
                if (!isMaximized && !isMobile) {
                  dragControls.start(e);
                }
              }}
            >
              <div className={`flex items-center gap-2 font-mono font-bold ${isMobile ? 'text-sm' : 'text-xs'} uppercase tracking-widest select-none`}>
                {icon && <span style={{ color: currentTheme.colors.primary }}>{icon}</span>}
                {title}
              </div>

              {/* Controls - larger on mobile */}
              <div className="flex items-center gap-1" onPointerDown={(e) => e.stopPropagation()}>
                {!isMobile && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMinimized(true);
                      }}
                      className="w-6 h-6 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 rounded transition-colors"
                      title="Minimize"
                    >
                      <Minus size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMaximized(!isMaximized);
                      }}
                      className="w-6 h-6 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 rounded transition-colors"
                      title={isMaximized ? "Restore" : "Maximize"}
                    >
                      {isMaximized ? <Square size={10} /> : <Maximize2 size={10} />}
                    </button>
                  </>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                  }}
                  className={`${isMobile ? 'w-10 h-10' : 'w-6 h-6'} flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors rounded`}
                  title="Close"
                >
                  <X size={isMobile ? 20 : 14} />
                </button>
              </div>
            </div>

            {/* CONTENT AREA */}
            <div
              className="flex-1 overflow-hidden relative"
              style={{
                height: isMobile
                  ? 'calc(85vh - 56px - env(safe-area-inset-bottom))'
                  : (isMaximized ? 'calc(100vh - 40px)' : `${windowHeight - 40}px`),
                paddingBottom: isMobile ? 'env(safe-area-inset-bottom)' : 0,
              }}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="h-full overflow-auto scrollbar-thin mobile-scroll">
                {children}
              </div>
              {/* Grid overlay for texture - hidden on mobile for performance */}
              {!isMobile && (
                <div
                  className="absolute inset-0 pointer-events-none opacity-[0.03]"
                  style={{
                    backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)',
                    backgroundSize: '10px 10px'
                  }}
                />
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
