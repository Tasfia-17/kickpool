'use client';

import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'motion/react';
import { Children, cloneElement, useEffect, useMemo, useRef, useState } from 'react';
import './Dock.css';

function DockItem({ children, className = '', onClick, mouseX, spring, distance, magnification, baseItemSize }: any) {
  const ref = useRef<HTMLDivElement>(null);
  const isHovered = useMotionValue(0);
  const mouseDistance = useTransform(mouseX, (val: number) => {
    const rect = ref.current?.getBoundingClientRect() ?? {
      x: 0,
      width: baseItemSize
    };
    return val - rect.x - baseItemSize / 2;
  });

  const targetSize = useTransform(mouseDistance, [-distance, 0, distance], [baseItemSize, magnification, baseItemSize]);
  const size = useSpring(targetSize, spring);

  return (
    <motion.div
      ref={ref}
      style={{
        width: size,
        height: size
      }}
      onHoverStart={() => isHovered.set(1)}
      onHoverEnd={() => isHovered.set(0)}
      onFocus={() => isHovered.set(1)}
      onBlur={() => isHovered.set(0)}
      onClick={onClick}
      className={`dock-item ${className}`}
      tabIndex={0}
      role="button"
      aria-haspopup="true"
    >
      {Children.map(children, (child: any) => cloneElement(child, { isHovered }))}
    </motion.div>
  );
}

function DockLabel({ children, className = '', ...rest }: any) {
  const { isHovered } = rest;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = isHovered.on('change', (latest: number) => {
      setIsVisible(latest === 1);
    });

    return () => unsubscribe();
  }, [isHovered]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: 1, y: -10 }}
          exit={{ opacity: 0, y: 0 }}
          transition={{ duration: 0.2 }}
          className={`dock-label ${className}`}
          role="tooltip"
          style={{ x: '-50%' }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DockIcon({ children, className = '' }: any) {
  return <div className={`dock-icon ${className}`}>{children}</div>;
}

interface DockItem {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  className?: string;
}

interface DockProps {
  items: DockItem[];
  className?: string;
  spring?: { mass: number; stiffness: number; damping: number };
  magnification?: number;
  distance?: number;
  panelHeight?: number;
  dockHeight?: number;
  baseItemSize?: number;
  themeColor?: string;
}

export default function Dock({
  items,
  className = '',
  spring = { mass: 0.1, stiffness: 150, damping: 12 },
  magnification = 70,
  distance = 200,
  panelHeight = 68,
  dockHeight = 256,
  baseItemSize = 50,
  themeColor,
}: DockProps) {
  const mouseX = useMotionValue(Infinity);
  const isHovered = useMotionValue(0);
  const [isDark, setIsDark] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);

    const checkDarkMode = () => {
      if (typeof document !== 'undefined') {
        setIsDark(document.documentElement.classList.contains('dark'));
      }
    };
    checkDarkMode();
    if (typeof document !== 'undefined') {
      const observer = new MutationObserver(checkDarkMode);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
      return () => {
        observer.disconnect();
        window.removeEventListener('resize', checkMobile);
      };
    }
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Disable magnification effect on mobile
  const effectiveMagnification = isMobile ? baseItemSize : magnification;
  const effectiveBaseItemSize = isMobile ? 42 : baseItemSize;
  const effectivePanelHeight = isMobile ? 60 : panelHeight;

  const maxHeight = useMemo(
    () => Math.max(dockHeight, effectiveMagnification + effectiveMagnification / 2 + 4),
    [effectiveMagnification, dockHeight]
  );

  const heightRow = useTransform(isHovered, [0, 1], [effectivePanelHeight, isMobile ? effectivePanelHeight : maxHeight]);
  const height = useSpring(heightRow, spring);

  return (
    <motion.div style={{ height: isMobile ? 'auto' : height, scrollbarWidth: 'none', overflow: 'visible' }} className="dock-outer" data-tour="dock">
      <motion.div
        onMouseMove={({ pageX }) => {
          if (!isMobile) {
            isHovered.set(1);
            mouseX.set(pageX);
          }
        }}
        onMouseLeave={() => {
          isHovered.set(0);
          mouseX.set(Infinity);
        }}
        className={`dock-panel ${isDark ? 'dark-mode' : ''} ${themeColor ? 'themed' : ''} ${className}`}
        style={{
          height: isMobile ? 'auto' : effectivePanelHeight,
          ...(themeColor ? { '--dock-theme': themeColor } as React.CSSProperties : {}),
        }}
        role="toolbar"
        aria-label="Application dock"
      >
        <div className="dock-panel-inner">
          {items.map((item, index) => (
            <DockItem
              key={index}
              onClick={item.onClick}
              className={item.className}
              mouseX={mouseX}
              spring={spring}
              distance={isMobile ? 0 : distance}
              magnification={effectiveMagnification}
              baseItemSize={effectiveBaseItemSize}
            >
              <DockIcon>{item.icon}</DockIcon>
              <DockLabel>{item.label}</DockLabel>
            </DockItem>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
