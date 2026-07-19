"use client";

import React, { useState, useEffect, useCallback, memo } from 'react';
import { motion } from 'motion/react';
import { usePokemonTheme } from '@/components/PokemonThemeProvider';
import { getPokeSprite } from '@/lib/catThemes';

// Common Pokemon IDs shared across all themes as base particles
// Meowth(52), Mew(151), Staryu(120), Togepi(175), Ditto(132)
const BASE_PARTICLE_IDS = [52, 151, 120, 175, 132];

interface FloatingSprite {
  id: number;
  pokemonId: number;
  spriteUrl: string;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
}

export const FloatingParticles = memo(function FloatingParticles() {
  const [particles, setParticles] = useState<FloatingSprite[]>([]);
  const [shouldRender, setShouldRender] = useState(false);
  const { currentTheme } = usePokemonTheme();

  useEffect(() => {
    // Skip particles entirely on mobile — purely decorative and expensive on low-end GPUs
    const mql = window.matchMedia('(min-width: 640px)');
    setShouldRender(mql.matches);

    const onChange = (e: MediaQueryListEvent) => setShouldRender(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (!shouldRender) {
      setParticles([]);
      return;
    }

    const particleCount = 18;
    // Combine theme-specific Pokemon IDs with base Pokemon IDs
    const themeIds = currentTheme.particleIds || [];
    const allIds = [...themeIds, ...BASE_PARTICLE_IDS];

    const newParticles: FloatingSprite[] = Array.from({ length: particleCount }, (_, i) => {
      const pokemonId = allIds[Math.floor(Math.random() * allIds.length)];
      return {
        id: i,
        pokemonId,
        spriteUrl: getPokeSprite(pokemonId),
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 28 + Math.random() * 20,
        duration: 18 + Math.random() * 22,
        delay: Math.random() * 12,
        opacity: 0.12 + Math.random() * 0.18,
      };
    });
    setParticles(newParticles);
  }, [shouldRender, currentTheme]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute animate-float select-none"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            opacity: p.opacity,
          }}
        >
          <img
            src={p.spriteUrl}
            alt=""
            width={p.size}
            height={p.size}
            loading="lazy"
            draggable={false}
            style={{ imageRendering: 'pixelated' }}
          />
        </div>
      ))}
    </div>
  );
});

// Confetti explosion effect
interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  delay: number;
  duration: number;
}

export const Confetti = memo(function Confetti({ active }: { active: boolean }) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (active) {
      const colors = ['#ff6b6b', '#feca57', '#48dbfb', '#1dd1a1', '#5f27cd', '#ff9ff3', '#54a0ff'];
      const newPieces: ConfettiPiece[] = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 8 + Math.random() * 8,
        rotation: Math.random() * 360,
        delay: Math.random() * 0.5,
        duration: 2 + Math.random() * 2,
      }));
      setPieces(newPieces);

      // Clear after animation
      const timer = setTimeout(() => setPieces([]), 4000);
      return () => clearTimeout(timer);
    }
  }, [active]);

  if (!active || pieces.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute w-3 h-3"
          style={{
            left: `${piece.x}%`,
            top: '-20px',
            backgroundColor: piece.color,
            animation: `confetti-fall ${piece.duration}s ease-out ${piece.delay}s forwards`,
            borderRadius: Math.random() > 0.5 ? '50%' : '0',
          }}
        />
      ))}
    </div>
  );
});

// Sparkle cursor trail
export const SparkleTrail = memo(function SparkleTrail() {
  const [sparkles, setSparkles] = useState<{ id: number; x: number; y: number }[]>([]);
  const sparkleId = React.useRef(0);

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const handleMouseMove = (e: MouseEvent) => {
      // Throttle sparkle creation
      if (timeout) return;

      timeout = setTimeout(() => {
        setSparkles(prev => {
          const newSparkle = {
            id: sparkleId.current++,
            x: e.clientX,
            y: e.clientY,
          };
          // Keep only last 5 sparkles
          return [...prev.slice(-4), newSparkle];
        });
        timeout = undefined as any;
      }, 50);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  // Auto-remove old sparkles
  useEffect(() => {
    if (sparkles.length > 0) {
      const timer = setTimeout(() => {
        setSparkles(prev => prev.slice(1));
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [sparkles]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {sparkles.map((s, i) => (
        <div
          key={s.id}
          className="absolute animate-sparkle select-none"
          style={{
            left: s.x - 10,
            top: s.y - 10,
            opacity: (i + 1) / sparkles.length,
            fontSize: '20px',
          }}
        >
          ✨
        </div>
      ))}
    </div>
  );
});

// Konami Code Easter Egg
const KONAMI_CODE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

export function useKonamiCode(callback: () => void) {
  const [keySequence, setKeySequence] = useState<string[]>([]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setKeySequence(prev => {
        const newSequence = [...prev, e.key].slice(-10);

        // Check if sequence matches Konami code
        if (newSequence.length === 10 && newSequence.every((key, i) => key === KONAMI_CODE[i])) {
          callback();
          return [];
        }

        return newSequence;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [callback]);

  return keySequence;
}

// Click counter Easter Egg (secret mode after many clicks)
export function useClickCounter(threshold: number = 10) {
  const [clicks, setClicks] = useState(0);
  const [triggered, setTriggered] = useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout | undefined>(undefined);

  const handleClick = useCallback(() => {
    setClicks(prev => {
      const newCount = prev + 1;

      // Reset after 2 seconds of no clicks
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setClicks(0), 2000);

      if (newCount >= threshold) {
        setTriggered(true);
        setTimeout(() => setTriggered(false), 3000);
        return 0;
      }
      return newCount;
    });
  }, [threshold]);

  return { clicks, triggered, handleClick };
}

// Rainbow text component
export const RainbowText = memo(function RainbowText({
  children,
  className = ''
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`animate-rainbow-text font-black ${className}`}>
      {children}
    </span>
  );
});

// Bouncy button wrapper
export const BouncyWrapper = memo(function BouncyWrapper({
  children,
  className = ''
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [bouncing, setBouncing] = useState(false);

  return (
    <div
      className={`${bouncing ? 'animate-jelly' : ''} ${className}`}
      onMouseEnter={() => setBouncing(true)}
      onAnimationEnd={() => setBouncing(false)}
    >
      {children}
    </div>
  );
});

// Tooltip with Pokemon icon
export const CatTooltip = memo(function CatTooltip({
  children,
  icon = '⭐',
  text,
}: {
  children: React.ReactNode;
  icon?: string;
  text: string;
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        {children}
      </div>
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-black dark:bg-white text-white dark:text-black text-xs font-bold rounded-none border-2 border-white dark:border-black shadow-[4px_4px_0px_0px_rgba(255,255,255,0.3)] whitespace-nowrap z-50 animate-fade-in-scale flex items-center gap-2">
          <span>{icon}</span>
          {text}
        </div>
      )}
    </div>
  );
});

// Loading dots animation
export const LoadingDots = memo(function LoadingDots() {
  return (
    <span className="inline-flex gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 bg-current rounded-full"
          style={{
            animation: 'typing-dots 1s infinite',
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
    </span>
  );
});

// Glowing badge
export const GlowBadge = memo(function GlowBadge({
  children,
  color = '#ff69b4',
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <span
      className="inline-flex items-center px-2 py-1 text-xs font-bold rounded-sm animate-pulse"
      style={{
        backgroundColor: color,
        color: 'white',
        boxShadow: `0 0 10px ${color}, 0 0 20px ${color}`,
      }}
    >
      {children}
    </span>
  );
});

// Click Shockwave - Ripple effect on background clicks
export const ClickShockwave = memo(function ClickShockwave() {
  const [clicks, setClicks] = useState<{ x: number, y: number, id: number, color: string }[]>([]);
  const { currentTheme } = usePokemonTheme();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // Only trigger on background clicks (not on interactive elements)
      const target = e.target as HTMLElement;
      if (target.closest('button, a, input, select, textarea, [role="button"]')) {
        return;
      }

      const id = Date.now();
      const color = currentTheme.colors.primary || '#60a5fa';
      setClicks(prev => [...prev, { x: e.clientX, y: e.clientY, id, color }]);

      // Remove after animation
      setTimeout(() => {
        setClicks(prev => prev.filter(c => c.id !== id));
      }, 600);
    };

    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [currentTheme.colors.primary]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {clicks.map(c => (
        <motion.div
          key={c.id}
          initial={{ width: 0, height: 0, opacity: 0.8 }}
          animate={{ width: 100, height: 100, opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="absolute rounded-full border-2"
          style={{
            left: c.x,
            top: c.y,
            transform: 'translate(-50%, -50%)',
            borderColor: c.color,
          }}
        />
      ))}
    </div>
  );
});

// Party Mode Effects - Improved confetti, border glow, flash
interface PartyEffectsProps {
  active: boolean;
  duration?: number;
}

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
  delay: number;
  duration: number;
}

export const PartyEffects = memo(function PartyEffects({ active, duration = 5000 }: PartyEffectsProps) {
  const [showFlash, setShowFlash] = useState(false);
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const [showBorder, setShowBorder] = useState(false);
  
  // Trigger flash and confetti on activation
  useEffect(() => {
    if (active) {
      // Screen flash
      setShowFlash(true);
      const flashTimer = setTimeout(() => setShowFlash(false), 300);
      
      // Generate confetti pieces
      const colors = ['#ff6b6b', '#feca57', '#48dbfb', '#1dd1a1', '#5f27cd', '#ff9ff3', '#54a0ff', '#ffeaa7', '#fd79a8', '#00cec9'];
      const pieces: ConfettiPiece[] = Array.from({ length: 80 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: -20 - Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 8 + Math.random() * 8,
        rotation: Math.random() * 360,
        delay: Math.random() * 0.3,
        duration: 2 + Math.random() * 2,
      }));
      setConfetti(pieces);
      
      // Show border glow
      setShowBorder(true);
      
      // Clean up after duration
      const cleanupTimer = setTimeout(() => {
        setConfetti([]);
        setShowBorder(false);
      }, duration);
      
      return () => {
        clearTimeout(flashTimer);
        clearTimeout(cleanupTimer);
      };
    }
  }, [active, duration]);
  
  if (!active) return null;
  
  return (
    <>
      {/* Screen Flash */}
      {showFlash && <div className="party-flash" />}
      
      {/* Border Glow */}
      {showBorder && <div className="party-border-glow" />}
      
      {/* Confetti */}
      <div className="party-confetti-container">
        {confetti.map((piece) => (
          <div
            key={piece.id}
            className="party-confetti-piece"
            style={{
              left: `${piece.x}%`,
              top: `${piece.y}px`,
              backgroundColor: piece.color,
              width: piece.size,
              height: piece.size,
              transform: `rotate(${piece.rotation}deg)`,
              animationDelay: `${piece.delay}s`,
              borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            }}
          />
        ))}
      </div>
    </>
  );
});