'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import './IDCard.css';

// Animation configuration (matching ProfileCard)
const ANIMATION_CONFIG = {
  INITIAL_DURATION: 2000,
  INITIAL_X_OFFSET: 70,
  INITIAL_Y_OFFSET: 60,
  DEVICE_BETA_OFFSET: 20,
  ENTER_TRANSITION_MS: 400
};

const clamp = (v: number, min = 0, max = 100) => Math.min(Math.max(v, min), max);
const round = (v: number, precision = 3) => parseFloat(v.toFixed(precision));
const adjust = (v: number, fMin: number, fMax: number, tMin: number, tMax: number) =>
  round(tMin + ((tMax - tMin) * (v - fMin)) / (fMax - fMin));

interface TiltEngine {
  setImmediate: (x: number, y: number) => void;
  setTarget: (x: number, y: number) => void;
  toCenter: () => void;
  beginInitial: (durationMs: number) => void;
  getCurrent: () => { x: number; y: number; tx: number; ty: number };
  cancel: () => void;
}

// ID Card Styles - Phasmophobia inspired
export const ID_CARD_STYLES = {
  director: {
    id: 'director',
    name: 'Director',
    description: 'Dark elite style for admins',
    headerBg: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    bodyBg: 'linear-gradient(180deg, #0f0f1a 0%, #1a1a2e 100%)',
    accentColor: '#4a4a6a',
    textColor: '#ffffff',
    borderColor: '#3a3a5a',
    hologramColor: 'rgba(100, 100, 150, 0.3)',
  },
  officer: {
    id: 'officer',
    name: 'Officer',
    description: 'Blue official style',
    headerBg: 'linear-gradient(135deg, #1e3a5f 0%, #0d2137 100%)',
    bodyBg: 'linear-gradient(180deg, #0d1b2a 0%, #1b263b 100%)',
    accentColor: '#415a77',
    textColor: '#e0e1dd',
    borderColor: '#415a77',
    hologramColor: 'rgba(65, 90, 119, 0.4)',
  },
  reporter: {
    id: 'reporter',
    name: 'Reporter',
    description: 'Purple media style',
    headerBg: 'linear-gradient(135deg, #4a1942 0%, #2d132c 100%)',
    bodyBg: 'linear-gradient(180deg, #1a0a1a 0%, #2d132c 100%)',
    accentColor: '#6b2d5b',
    textColor: '#e8d5e8',
    borderColor: '#6b2d5b',
    hologramColor: 'rgba(107, 45, 91, 0.4)',
  },
  medium: {
    id: 'medium',
    name: 'Medium',
    description: 'Red mystic style',
    headerBg: 'linear-gradient(135deg, #5c1a1a 0%, #3d1010 100%)',
    bodyBg: 'linear-gradient(180deg, #1a0808 0%, #3d1010 100%)',
    accentColor: '#8b2525',
    textColor: '#f5d5d5',
    borderColor: '#8b2525',
    hologramColor: 'rgba(139, 37, 37, 0.4)',
  },
  artist: {
    id: 'artist',
    name: 'Ghost Artist',
    description: 'Purple creative style with gold accent',
    headerBg: 'linear-gradient(135deg, #4a1f6b 0%, #2a1040 100%)',
    bodyBg: 'linear-gradient(180deg, #1a0830 0%, #2a1040 100%)',
    accentColor: '#d4af37',
    textColor: '#e8d5f5',
    borderColor: '#6b3fa0',
    hologramColor: 'rgba(212, 175, 55, 0.3)',
    hasGoldStripe: true,
  },
  vip: {
    id: 'vip',
    name: 'VIP',
    description: 'Golden premium style',
    headerBg: 'linear-gradient(135deg, #5c4a1a 0%, #3d3210 100%)',
    bodyBg: 'linear-gradient(180deg, #1a1508 0%, #3d3210 100%)',
    accentColor: '#d4af37',
    textColor: '#fff5d5',
    borderColor: '#d4af37',
    hologramColor: 'rgba(212, 175, 55, 0.4)',
  },
  cyber: {
    id: 'cyber',
    name: 'Cyber',
    description: 'Neon cyberpunk style',
    headerBg: 'linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 100%)',
    bodyBg: 'linear-gradient(180deg, #050510 0%, #0a0a1a 100%)',
    accentColor: '#00ffff',
    textColor: '#00ffff',
    borderColor: '#00ffff',
    hologramColor: 'rgba(0, 255, 255, 0.2)',
    isNeon: true,
  },
  hacker: {
    id: 'hacker',
    name: 'Hacker',
    description: 'Matrix green terminal style',
    headerBg: 'linear-gradient(135deg, #0a1a0a 0%, #0d2e0d 100%)',
    bodyBg: 'linear-gradient(180deg, #050a05 0%, #0a1a0a 100%)',
    accentColor: '#00ff00',
    textColor: '#00ff00',
    borderColor: '#00ff00',
    hologramColor: 'rgba(0, 255, 0, 0.2)',
    isNeon: true,
  },
  sakura: {
    id: 'sakura',
    name: 'Sakura',
    description: 'Pink cherry blossom style',
    headerBg: 'linear-gradient(135deg, #4a1a3a 0%, #2e1020 100%)',
    bodyBg: 'linear-gradient(180deg, #1a0815 0%, #2e1020 100%)',
    accentColor: '#ff69b4',
    textColor: '#ffd5e5',
    borderColor: '#ff69b4',
    hologramColor: 'rgba(255, 105, 180, 0.3)',
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean',
    description: 'Deep sea blue style',
    headerBg: 'linear-gradient(135deg, #0a2a4a 0%, #051530 100%)',
    bodyBg: 'linear-gradient(180deg, #030a15 0%, #0a1a2a 100%)',
    accentColor: '#00bfff',
    textColor: '#d5f5ff',
    borderColor: '#0077be',
    hologramColor: 'rgba(0, 191, 255, 0.3)',
  },
};

export type IDCardStyleKey = keyof typeof ID_CARD_STYLES;

interface IDCardProps {
  // User info
  username: string;
  title?: string;
  level?: number;
  xp?: number;
  maxXp?: number;
  avatarUrl?: string;

  // Card customization
  cardStyle?: IDCardStyleKey;
  customHeaderBg?: string;
  customBodyBg?: string;
  customAccent?: string;
  customBorder?: string;
  customHologram?: string;

  // Layout options
  showLevel?: boolean;
  showXpBar?: boolean;
  showHologram?: boolean;
  showScanlines?: boolean;
  showCornerClip?: boolean;
  isShiny?: boolean;

  // Tilt options (like ProfileCard)
  enableTilt?: boolean;
  enableMobileTilt?: boolean;
  mobileTiltSensitivity?: number;

  // Size
  size?: 'sm' | 'md' | 'lg';

  // Interaction
  onClick?: () => void;
  className?: string;
}

export const IDCard: React.FC<IDCardProps> = ({
  username,
  title = 'Member',
  level = 1,
  xp = 0,
  maxXp = 1000,
  avatarUrl,
  cardStyle = 'officer',
  customHeaderBg,
  customBodyBg,
  customAccent,
  customBorder,
  customHologram,
  showLevel = true,
  showXpBar = true,
  showHologram = true,
  showScanlines = true,
  showCornerClip = true,
  isShiny = false,
  enableTilt = true,
  enableMobileTilt = false,
  mobileTiltSensitivity = 5,
  size = 'md',
  onClick,
  className = '',
}) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const enterTimerRef = useRef<number | null>(null);
  const leaveRafRef = useRef<number | null>(null);

  const style = ID_CARD_STYLES[cardStyle];

  // Use custom colors or fall back to style defaults
  const headerBg = customHeaderBg || style.headerBg;
  const bodyBg = customBodyBg || style.bodyBg;
  const accentColor = customAccent || style.accentColor;
  const borderColor = customBorder || style.borderColor;
  const hologramColor = customHologram || style.hologramColor;
  const textColor = style.textColor;

  // Size classes
  const sizeClasses = {
    sm: 'w-48 h-28',
    md: 'w-72 h-44',
    lg: 'w-96 h-56',
  };

  const fontSizes = {
    sm: { title: 'text-[8px]', name: 'text-xs', level: 'text-[10px]', xp: 'text-[8px]' },
    md: { title: 'text-[10px]', name: 'text-sm', level: 'text-xs', xp: 'text-[10px]' },
    lg: { title: 'text-xs', name: 'text-base', level: 'text-sm', xp: 'text-xs' },
  };

  const avatarSizes = {
    sm: 'w-14 h-16',
    md: 'w-20 h-24',
    lg: 'w-28 h-32',
  };

  // TiltEngine - same as ProfileCard
  const tiltEngine = useMemo((): TiltEngine | null => {
    if (!enableTilt) return null;

    let rafId: number | null = null;
    let running = false;
    let lastTs = 0;

    let currentX = 0;
    let currentY = 0;
    let targetX = 0;
    let targetY = 0;

    const DEFAULT_TAU = 0.25;  // Same as ProfileCard for smooth response
    const LEAVE_TAU = 0.5;     // Slower, smoother return when leaving (like ProfileCard)
    const INITIAL_TAU = 0.8;   // Same as ProfileCard
    let initialUntil = 0;
    let isLeaving = false;

    const setVarsFromXY = (x: number, y: number) => {
      const shell = shellRef.current;
      const wrap = wrapRef.current;
      if (!shell || !wrap) return;

      const width = shell.clientWidth || 1;
      const height = shell.clientHeight || 1;

      const percentX = clamp((100 / width) * x);
      const percentY = clamp((100 / height) * y);

      const centerX = percentX - 50;
      const centerY = percentY - 50;

      const properties: Record<string, string> = {
        '--pointer-x': `${percentX}%`,
        '--pointer-y': `${percentY}%`,
        '--background-x': `${adjust(percentX, 0, 100, 35, 65)}%`,
        '--background-y': `${adjust(percentY, 0, 100, 35, 65)}%`,
        '--pointer-from-center': `${clamp(Math.hypot(percentY - 50, percentX - 50) / 50, 0, 1)}`,
        '--pointer-from-top': `${percentY / 100}`,
        '--pointer-from-left': `${percentX / 100}`,
        '--rotate-x': `${round(-(centerX / 5))}deg`,
        '--rotate-y': `${round(centerY / 4)}deg`
      };

      for (const [k, v] of Object.entries(properties)) wrap.style.setProperty(k, v);
    };

    const step = (ts: number) => {
      if (!running) return;
      if (lastTs === 0) lastTs = ts;
      const dt = (ts - lastTs) / 1000;
      lastTs = ts;

      // Use different tau based on state: leaving = slower, hovering = faster
      const tau = ts < initialUntil ? INITIAL_TAU : (isLeaving ? LEAVE_TAU : DEFAULT_TAU);
      const k = 1 - Math.exp(-dt / tau);

      currentX += (targetX - currentX) * k;
      currentY += (targetY - currentY) * k;

      setVarsFromXY(currentX, currentY);

      const stillFar = Math.abs(targetX - currentX) > 0.05 || Math.abs(targetY - currentY) > 0.05;

      if (stillFar || document.hasFocus()) {
        rafId = requestAnimationFrame(step);
      } else {
        running = false;
        lastTs = 0;
        isLeaving = false;
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      }
    };

    const start = () => {
      if (running) return;
      running = true;
      lastTs = 0;
      rafId = requestAnimationFrame(step);
    };

    return {
      setImmediate(x: number, y: number) {
        currentX = x;
        currentY = y;
        setVarsFromXY(currentX, currentY);
      },
      setTarget(x: number, y: number) {
        isLeaving = false;
        targetX = x;
        targetY = y;
        start();
      },
      toCenter() {
        const shell = shellRef.current;
        if (!shell) return;
        isLeaving = true;  // Enable smooth slow return
        targetX = shell.clientWidth / 2;
        targetY = shell.clientHeight / 2;
        start();
      },
      beginInitial(durationMs: number) {
        initialUntil = performance.now() + durationMs;
        start();
      },
      getCurrent() {
        return { x: currentX, y: currentY, tx: targetX, ty: targetY };
      },
      cancel() {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
        running = false;
        lastTs = 0;
        isLeaving = false;
      }
    };
  }, [enableTilt]);

  const getOffsets = (evt: PointerEvent, el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
  };

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      const shell = shellRef.current;
      if (!shell || !tiltEngine) return;
      const { x, y } = getOffsets(event, shell);
      tiltEngine.setTarget(x, y);
    },
    [tiltEngine]
  );

  const handlePointerEnter = useCallback(
    (event: PointerEvent) => {
      const shell = shellRef.current;
      if (!shell || !tiltEngine) return;

      shell.classList.add('active');
      shell.classList.add('entering');
      if (enterTimerRef.current) window.clearTimeout(enterTimerRef.current);
      enterTimerRef.current = window.setTimeout(() => {
        shell.classList.remove('entering');
      }, ANIMATION_CONFIG.ENTER_TRANSITION_MS);

      const { x, y } = getOffsets(event, shell);
      tiltEngine.setTarget(x, y);
    },
    [tiltEngine]
  );

  const handlePointerLeave = useCallback(() => {
    const shell = shellRef.current;
    if (!shell || !tiltEngine) return;

    tiltEngine.toCenter();

    // Delay removing active class for smoother fade out
    const checkSettle = () => {
      const { x, y, tx, ty } = tiltEngine.getCurrent();
      const distance = Math.hypot(tx - x, ty - y);
      // Wait until animation is mostly settled (larger threshold for smoother transition)
      if (distance < 2) {
        shell.classList.remove('active');
        leaveRafRef.current = null;
      } else {
        leaveRafRef.current = requestAnimationFrame(checkSettle);
      }
    };
    if (leaveRafRef.current) cancelAnimationFrame(leaveRafRef.current);
    leaveRafRef.current = requestAnimationFrame(checkSettle);
  }, [tiltEngine]);

  const handleDeviceOrientation = useCallback(
    (event: DeviceOrientationEvent) => {
      const shell = shellRef.current;
      if (!shell || !tiltEngine) return;

      const { beta, gamma } = event;
      if (beta == null || gamma == null) return;

      const centerX = shell.clientWidth / 2;
      const centerY = shell.clientHeight / 2;
      const x = clamp(centerX + gamma * mobileTiltSensitivity, 0, shell.clientWidth);
      const y = clamp(
        centerY + (beta - ANIMATION_CONFIG.DEVICE_BETA_OFFSET) * mobileTiltSensitivity,
        0,
        shell.clientHeight
      );

      tiltEngine.setTarget(x, y);
    },
    [tiltEngine, mobileTiltSensitivity]
  );

  useEffect(() => {
    if (!enableTilt || !tiltEngine) return;

    const shell = shellRef.current;
    if (!shell) return;

    const pointerMoveHandler = handlePointerMove;
    const pointerEnterHandler = handlePointerEnter;
    const pointerLeaveHandler = handlePointerLeave;
    const deviceOrientationHandler = handleDeviceOrientation;

    shell.addEventListener('pointerenter', pointerEnterHandler as EventListener);
    shell.addEventListener('pointermove', pointerMoveHandler as EventListener);
    shell.addEventListener('pointerleave', pointerLeaveHandler as EventListener);

    const handleClick = () => {
      if (!enableMobileTilt || location.protocol !== 'https:') return;
      const anyMotion = window.DeviceMotionEvent as any;
      if (anyMotion && typeof anyMotion.requestPermission === 'function') {
        anyMotion
          .requestPermission()
          .then((state: string) => {
            if (state === 'granted') {
              window.addEventListener('deviceorientation', deviceOrientationHandler);
            }
          })
          .catch(console.error);
      } else {
        window.addEventListener('deviceorientation', deviceOrientationHandler);
      }
    };
    shell.addEventListener('click', handleClick);

    const initialX = (shell.clientWidth || 0) - ANIMATION_CONFIG.INITIAL_X_OFFSET;
    const initialY = ANIMATION_CONFIG.INITIAL_Y_OFFSET;
    tiltEngine.setImmediate(initialX, initialY);
    tiltEngine.toCenter();
    tiltEngine.beginInitial(ANIMATION_CONFIG.INITIAL_DURATION);

    return () => {
      shell.removeEventListener('pointerenter', pointerEnterHandler as EventListener);
      shell.removeEventListener('pointermove', pointerMoveHandler as EventListener);
      shell.removeEventListener('pointerleave', pointerLeaveHandler as EventListener);
      shell.removeEventListener('click', handleClick);
      window.removeEventListener('deviceorientation', deviceOrientationHandler);
      if (enterTimerRef.current) window.clearTimeout(enterTimerRef.current);
      if (leaveRafRef.current) cancelAnimationFrame(leaveRafRef.current);
      tiltEngine.cancel();
      shell.classList.remove('entering');
    };
  }, [
    enableTilt,
    enableMobileTilt,
    tiltEngine,
    handlePointerMove,
    handlePointerEnter,
    handlePointerLeave,
    handleDeviceOrientation
  ]);

  // Calculate level display
  const levelRoman = toRoman(Math.floor(level / 10) || 1);
  const levelNum = String(level % 100).padStart(3, '0');
  const xpPercent = Math.min((xp / maxXp) * 100, 100);

  // Card style for CSS variables
  const cardStyleVars = useMemo(() => ({
    '--id-accent-color': accentColor,
    '--id-border-color': borderColor,
    '--id-hologram-color': hologramColor,
    '--id-header-bg': headerBg,
    '--id-body-bg': bodyBg,
  } as React.CSSProperties), [accentColor, borderColor, hologramColor, headerBg, bodyBg]);

  return (
    <div
      ref={wrapRef}
      className={`id-card-wrapper ${sizeClasses[size]} ${isShiny ? 'is-shiny' : ''} ${className}`}
      style={cardStyleVars}
      onClick={onClick}
    >
      {/* Behind Glow Effect */}
      <div className="id-behind" style={{ '--id-glow-color': `${accentColor}60` } as React.CSSProperties} />

      <div ref={shellRef} className="id-card-shell">
        <section className="id-card" style={{ background: bodyBg, borderColor }}>
          <div className="id-inside">
            {/* Shine Effect */}
            <div className="id-shine" style={{ '--id-accent': accentColor } as React.CSSProperties} />

            {/* Glare Effect */}
            <div className="id-glare" />

            {/* Corner Clip Effect */}
            {showCornerClip && (
              <div
                className="absolute top-0 right-0 w-6 h-6 z-10"
                style={{
                  background: `linear-gradient(135deg, transparent 50%, ${accentColor}40 50%)`,
                }}
              />
            )}

            {/* Header Bar */}
            <div
              className="id-header relative px-3 py-1.5 flex items-center justify-between z-10"
              style={{ background: headerBg }}
            >
              <span
                className={`${fontSizes[size].title} font-bold uppercase tracking-[0.2em]`}
                style={{ color: accentColor }}
              >
                {title}
              </span>

              {/* Checkmark/Verified Icon */}
              <div
                className="w-4 h-4 rounded border flex items-center justify-center"
                style={{ borderColor: accentColor, background: `${accentColor}20` }}
              >
                <svg className="w-2.5 h-2.5" fill={accentColor} viewBox="0 0 20 20">
                  <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                </svg>
              </div>
            </div>

            {/* Gold Stripe for Artist style */}
            {(style as any).hasGoldStripe && (
              <div
                className="absolute top-8 left-0 right-0 h-8 opacity-30 z-5"
                style={{
                  background: `linear-gradient(90deg, transparent 0%, ${accentColor} 20%, ${accentColor} 80%, transparent 100%)`,
                  transform: 'skewY(-5deg)',
                }}
              />
            )}

            {/* Main Content */}
            <div className="id-content flex p-3 gap-3 relative z-10">
              {/* Avatar Section with parallax */}
              <div className="id-avatar-section relative flex-shrink-0">
                <div
                  className={`${avatarSizes[size]} rounded overflow-hidden border-2`}
                  style={{ borderColor: accentColor }}
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={username}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${username}`;
                      }}
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center"
                      style={{ background: `${accentColor}30` }}
                    >
                      <span className="text-2xl" style={{ color: textColor }}>
                        {username[0]?.toUpperCase() || '?'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Info Section */}
              <div className="id-info flex-1 flex flex-col justify-between min-w-0">
                {/* NAME Label */}
                <div>
                  <span
                    className={`${fontSizes[size].title} uppercase tracking-wider opacity-60`}
                    style={{ color: textColor }}
                  >
                    NAME
                  </span>
                  <p
                    className={`${fontSizes[size].name} font-bold truncate mt-0.5`}
                    style={{ color: textColor }}
                  >
                    {username}
                  </p>
                </div>

                {/* Level Section */}
                {showLevel && (
                  <div className="mt-auto">
                    <span
                      className={`${fontSizes[size].title} uppercase tracking-wider opacity-60`}
                      style={{ color: textColor }}
                    >
                      LEVEL
                    </span>
                    <p
                      className={`${fontSizes[size].level} font-mono font-bold`}
                      style={{ color: accentColor }}
                    >
                      {levelRoman}-{levelNum}
                    </p>
                  </div>
                )}
              </div>

              {/* Hologram Circle */}
              {showHologram && (
                <div className="id-hologram absolute right-3 top-1/2 -translate-y-1/4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{
                      background: `radial-gradient(circle, ${hologramColor} 0%, transparent 70%)`,
                      border: `1px solid ${accentColor}40`,
                    }}
                  >
                    <div
                      className="id-hologram-inner w-8 h-8 rounded-full"
                      style={{
                        background: `conic-gradient(from 0deg, ${accentColor}60, transparent, ${accentColor}60)`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* XP Bar */}
            {showXpBar && (
              <div className="absolute bottom-0 left-0 right-0 px-3 pb-2 z-10">
                <div
                  className="h-1.5 rounded-full overflow-hidden"
                  style={{ background: `${accentColor}20` }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${xpPercent}%`,
                      background: `linear-gradient(90deg, ${accentColor}80, ${accentColor})`,
                    }}
                  />
                </div>
                <div className="flex justify-between mt-0.5">
                  <span className={`${fontSizes[size].xp} opacity-60`} style={{ color: textColor }}>
                    {xp.toLocaleString()}/{maxXp.toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {/* Scanlines Overlay */}
            {showScanlines && (
              <div className="id-scanlines absolute inset-0 pointer-events-none opacity-10 z-20" />
            )}

            {/* Sparkles Effect - Pokemon Card Style */}
            <div className="id-sparkles" />

            {/* Starburst - Pointer Follow Light */}
            <div className="id-starburst" />

            {/* Neon Glow Effect for cyber/hacker styles */}
            {(style as any).isNeon && (
              <div
                className="id-neon-glow absolute inset-0 pointer-events-none z-15"
                style={{ '--id-neon-color': accentColor } as React.CSSProperties}
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

// Helper function to convert number to Roman numerals
function toRoman(num: number): string {
  const romanNumerals: [number, string][] = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
  ];

  let result = '';
  for (const [value, symbol] of romanNumerals) {
    while (num >= value) {
      result += symbol;
      num -= value;
    }
  }
  return result || 'I';
}

export default IDCard;
