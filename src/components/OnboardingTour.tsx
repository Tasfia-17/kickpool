'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

/* ─────────────────────── types ─────────────────────── */

interface TourStep {
  /** CSS selector — if null the step is a full-screen overlay (welcome / finish) */
  target: string | null;
  title: string;
  content: string;
  emoji: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

/* ─────────────────────── steps ─────────────────────── */

const GUEST_STEPS: TourStep[] = [
  {
    target: null,
    title: 'Welcome to CinePurr!',
    emoji: '🐱',
    content:
      'Watch movies, YouTube videos & live TV together with friends in perfect sync. Let us show you around — it only takes a moment!',
    position: 'center',
  },
  {
    target: '[data-tour="create-room"]',
    title: 'Create a Watch Room',
    emoji: '🎬',
    content:
      'Tap here to create your own room. You can set it public or private, name it, and invite anyone with a link or code.',
    position: 'bottom',
  },
  {
    target: '[data-tour="join-room"]',
    title: 'Join with a Code',
    emoji: '🔗',
    content:
      'Got a room code from a friend? Paste it here to jump straight into their watch party.',
    position: 'bottom',
  },
  {
    target: '[data-tour="server-browser"]',
    title: 'Browse Public Rooms',
    emoji: '🌐',
    content:
      'See what others are watching right now. Join any public room with one click and start vibing together.',
    position: 'left',
  },
  {
    target: '[data-tour="theme-bar"]',
    title: 'Pick Your Theme',
    emoji: '🎨',
    content:
      'Choose from adorable Pokémon themes to personalize your experience. Unlock exclusive ones as you level up!',
    position: 'top',
  },
  {
    target: '[data-tour="auth-buttons"]',
    title: 'Create an Account',
    emoji: '✨',
    content:
      'Sign up to save your progress, earn XP, unlock achievements, add friends, and customize your profile. It\'s completely free!',
    position: 'bottom',
  },
  {
    target: null,
    title: 'You\'re All Set!',
    emoji: '🎉',
    content:
      'That\'s everything you need to get started. Create a room, invite friends, and enjoy watching together. Have fun!',
    position: 'center',
  },
];

const LOGGED_IN_STEPS: TourStep[] = [
  {
    target: null,
    title: 'Welcome to CinePurr!',
    emoji: '🐱',
    content:
      'Watch movies, YouTube videos & live TV together with friends in perfect sync. Let us show you around — it only takes a moment!',
    position: 'center',
  },
  {
    target: '[data-tour="create-room"]',
    title: 'Create a Watch Room',
    emoji: '🎬',
    content:
      'Tap here to create your own room. You can set it public or private, name it, and invite anyone with a link or code.',
    position: 'bottom',
  },
  {
    target: '[data-tour="join-room"]',
    title: 'Join with a Code',
    emoji: '🔗',
    content:
      'Got a room code from a friend? Paste it here to jump straight into their watch party.',
    position: 'bottom',
  },
  {
    target: '[data-tour="server-browser"]',
    title: 'Browse Public Rooms',
    emoji: '🌐',
    content:
      'See what others are watching right now. Join any public room with one click and start vibing together.',
    position: 'left',
  },
  {
    target: '[data-tour="theme-bar"]',
    title: 'Pick Your Theme',
    emoji: '🎨',
    content:
      'Choose from adorable Pokémon themes to personalize your experience. Unlock exclusive ones as you level up!',
    position: 'top',
  },
  {
    target: '[data-tour="dock"]',
    title: 'Your Dock',
    emoji: '🚀',
    content:
      'Access XP, achievements, friends, minigames, daily quests and more — all from this handy dock at the bottom.',
    position: 'top',
  },
  {
    target: null,
    title: 'You\'re All Set!',
    emoji: '🎉',
    content:
      'That\'s everything you need to know. Create a room, invite friends, and enjoy watching together. Have fun!',
    position: 'center',
  },
];

/* ─────────────────────── component ─────────────────────── */

interface OnboardingTourProps {
  onComplete?: () => void;
  isLoggedIn?: boolean;
}

export default function OnboardingTour({ onComplete, isLoggedIn = false }: OnboardingTourProps) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  // Guard against mounting twice (StrictMode / concurrent re-renders)
  const initiated = useRef(false);

  const steps = isLoggedIn ? LOGGED_IN_STEPS : GUEST_STEPS;
  const current = steps[step];
  const isOverlay = current?.target === null;
  const total = steps.length;

  /* ── show only for first-time visitors ── */
  useEffect(() => {
    if (initiated.current) return;
    const isAutomationSession =
      typeof navigator !== 'undefined' && navigator.webdriver;
    if (isAutomationSession) {
      return;
    }
    const done = localStorage.getItem('cinepurr_tour_completed');
    if (!done) {
      initiated.current = true;
      // Increased delay to 4500ms so the intro animation fully completes before the tour pops up
      const t = setTimeout(() => setVisible(true), 4500);
      return () => clearTimeout(t);
    }
  }, []);

  /* ── track target element position ── */
  const measure = useCallback(() => {
    if (!current?.target) { setRect(null); return; }
    const el = document.querySelector(current.target);
    if (el) {
      setRect(el.getBoundingClientRect());
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      setRect(null);
    }
  }, [current]);

  useEffect(() => {
    if (!visible) return;
    const id = setTimeout(measure, 120);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      clearTimeout(id);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [visible, step, measure]);

  /* ── keyboard nav ── */
  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
      if (e.key === 'ArrowRight' || e.key === 'Enter') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, step]);

  const next = () => {
    if (step < total - 1) setStep(s => s + 1);
    else finish();
  };
  const prev = () => { if (step > 0) setStep(s => s - 1); };
  const finish = () => {
    localStorage.setItem('cinepurr_tour_completed', 'true');
    setVisible(false);
    onComplete?.();
  };

  /* ── tooltip positioning — mobile-aware ── */
  // Track mobile state with useState + useEffect for proper resize handling
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!visible) return null;

  const tooltipStyle = (): React.CSSProperties => {
    if (isOverlay || !rect) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    // On mobile, always anchor to bottom-center of screen with proper centering
    if (isMobile) {
      return {
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
      };
    }

    const pad = 16;
    // Use actual rendered width (min of 360px or 90vw)
    const tw = Math.min(360, window.innerWidth * 0.9);

    switch (current.position) {
      case 'bottom':
        return {
          top: rect.bottom + pad,
          left: Math.max(pad, Math.min(rect.left + rect.width / 2 - tw / 2, window.innerWidth - tw - pad)),
        };
      case 'top': {
        const topVal = rect.top - pad;
        // If would go off top, fall back to bottom
        if (topVal - 200 < 0) {
          return {
            top: rect.bottom + pad,
            left: Math.max(pad, Math.min(rect.left + rect.width / 2 - tw / 2, window.innerWidth - tw - pad)),
          };
        }
        return {
          bottom: window.innerHeight - rect.top + pad,
          left: Math.max(pad, Math.min(rect.left + rect.width / 2 - tw / 2, window.innerWidth - tw - pad)),
        };
      }
      case 'left': {
        const leftVal = rect.left - tw - pad;
        if (leftVal < pad) {
          // Fall back to bottom if no room on left
          return {
            top: rect.bottom + pad,
            left: Math.max(pad, Math.min(rect.left + rect.width / 2 - tw / 2, window.innerWidth - tw - pad)),
          };
        }
        return {
          top: Math.max(pad, Math.min(rect.top + rect.height / 2 - 120, window.innerHeight - 280 - pad)),
          left: leftVal,
        };
      }
      case 'right': {
        const rightVal = rect.right + pad;
        if (rightVal + tw > window.innerWidth - pad) {
          return {
            top: rect.bottom + pad,
            left: Math.max(pad, Math.min(rect.left + rect.width / 2 - tw / 2, window.innerWidth - tw - pad)),
          };
        }
        return {
          top: Math.max(pad, Math.min(rect.top + rect.height / 2 - 120, window.innerHeight - 280 - pad)),
          left: rightVal,
        };
      }
      default:
        return {};
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998]"
            style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
            onClick={finish}
          />

          {/* Spotlight cutout — hide on mobile to reduce visual noise */}
          <AnimatePresence mode="wait">
            {rect && !isOverlay && window.innerWidth >= 640 && (
              <motion.div
                key={`spot-${step}`}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ type: 'spring', damping: 24, stiffness: 300 }}
                className="fixed z-[9999] pointer-events-none rounded-xl"
                style={{
                  top: rect.top - 6,
                  left: rect.left - 6,
                  width: rect.width + 12,
                  height: rect.height + 12,
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.65)',
                  border: '2px solid rgba(255,255,255,0.5)',
                }}
              />
            )}
          </AnimatePresence>

          {/* Tooltip card — mode="wait" ensures old card exits before new one enters */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: isOverlay ? 30 : 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ type: 'spring', damping: 22, stiffness: 280, duration: 0.18 }}
              className={`fixed z-[10000] ${isMobile ? 'w-[85vw] max-w-[320px]' : 'w-[90vw] max-w-[360px]'}`}
              style={{
                ...tooltipStyle(),
                // Ensure proper touch handling on mobile
                touchAction: 'manipulation',
              }}
            >
              <div
                className="border-4 border-black p-5 relative"
                style={{
                  backgroundColor: '#1a1a24',
                  boxShadow: '8px 8px 0px rgba(0,0,0,1)',
                  imageRendering: 'pixelated',
                }}
              >
                {/* Progress bar (Retro dots) */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex gap-2">
                    {steps.map((_, i) => (
                      <div
                        key={i}
                        className="w-3 h-3 transition-colors duration-200"
                        style={{
                          backgroundColor:
                            i === step
                              ? '#facc15' // Yellow active
                              : i < step
                                ? '#a855f7' // Purple visited
                                : '#374151', // Gray unvisited
                          border: '2px solid black',
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-[12px] text-white/70 font-mono tracking-widest">
                    {step + 1}/{total}
                  </span>
                </div>

                {/* Emoji + Title */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl leading-none" style={{ textShadow: '2px 2px 0px black' }}>{current.emoji}</span>
                  <h3 className="text-xl font-bold text-white uppercase tracking-wider" style={{ textShadow: '2px 2px 0px black' }}>
                    {current.title}
                  </h3>
                </div>

                {/* Body */}
                <p className="text-sm text-white/90 leading-relaxed mb-6 font-mono">
                  {current.content}
                </p>

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {step > 0 ? (
                      <button data-testsprite-id="onboarding-btn"
                        onClick={prev}
                        className="text-xs text-white/70 hover:text-white transition-colors px-3 py-2 font-mono uppercase bg-black/20 hover:bg-black/40 border-2 border-transparent hover:border-black"
                      >
                        ← Back
                      </button>
                    ) : (
                      <button data-testsprite-id="onboarding-btn"
                        onClick={finish}
                        className="text-xs text-white/50 hover:text-white/90 transition-colors font-mono uppercase underline decoration-white/30 hover:decoration-white"
                      >
                        Skip
                      </button>
                    )}
                  </div>

                  <button data-testsprite-id="onboarding-btn"
                    onClick={next}
                    className={`px-5 py-2 text-sm font-bold uppercase tracking-wider transition-transform active:translate-y-1 ${isMobile ? 'min-h-[48px] min-w-[100px]' : ''}`}
                    style={{
                      backgroundColor: step === total - 1 ? '#22c55e' : '#facc15',
                      color: 'black',
                      border: '3px solid black',
                      boxShadow: '4px 4px 0px rgba(0,0,0,1)',
                      touchAction: 'manipulation',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    {step === 0
                      ? 'Let\'s go! →'
                      : step === total - 1
                        ? '✓ Finish'
                        : 'Next →'}
                  </button>
                </div>

                {/* Keyboard hint — desktop only */}
                <p className="hidden sm:block text-[10px] text-white/30 text-center mt-5 font-mono uppercase tracking-widest">
                  Use ← → to navigate or Esc to skip
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
}

/** Call this to reset the tour (testing only) */
export function useResetTour() {
  return () => {
    localStorage.removeItem('cinepurr_tour_completed');
    window.location.reload();
  };
}
