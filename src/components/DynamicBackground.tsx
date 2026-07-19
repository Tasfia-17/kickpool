'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from './ThemeProvider';
import { usePathname } from 'next/navigation';

type TimeState = 'Day' | 'Sunset' | 'Night';

export default function DynamicBackground() {
    const { isDarkMode, currentTheme } = useTheme();
    const [timeState, setTimeState] = useState<TimeState>('Day');
    const [mounted, setMounted] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        setMounted(true);
        const updateTime = () => {
            const hour = new Date().getHours();
            if (hour >= 6 && hour < 17) setTimeState('Day');
            else if (hour >= 17 && hour < 20) setTimeState('Sunset');
            else setTimeState('Night');
        };

        updateTime();
        const interval = setInterval(updateTime, 60000); // Check every minute
        return () => clearInterval(interval);
    }, []);

    // Don't render on room pages — mobile layout bleeds the gradient through as a gap
    if (pathname?.startsWith('/room/')) return null;

    if (!mounted) return null;

    // Background gradients based on time
    const darkBg = currentTheme.colors.darkBackground || '#0f172a';
    // Mix darkBackground with a subtle tint of the theme's primary color
    const gradients = {
        Day: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
        Sunset: 'linear-gradient(135deg, #ffedd5 0%, #fdba74 50%, #f97316 100%)',
        Night: `linear-gradient(135deg, ${darkBg} 0%, ${currentTheme.colors.primary}22 100%)`,
    };

    // Current state (Night if Dark Mode is forced or if it's naturally night)
    const activeState = isDarkMode ? 'Night' : timeState;

    return (
        <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden transition-colors duration-1000">
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeState}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 2 }}
                    className="absolute inset-0"
                    style={{ background: gradients[activeState] }}
                />
            </AnimatePresence>

            {/* Grid Overlay */}
            <div
                className={`absolute inset-0 opacity-[0.4] dark:opacity-[0.1]`}
                style={{
                    backgroundImage: `linear-gradient(${isDarkMode ? '#ffffff20' : '#00000015'} 1px, transparent 1px), linear-gradient(90deg, ${isDarkMode ? '#ffffff20' : '#00000015'} 1px, transparent 1px)`,
                    backgroundSize: '40px 40px'
                }}
            />

            {/* Environmental Elements */}
            {activeState === 'Day' && (
                <div className="absolute inset-0">
                    <Cloud x="10%" y="15%" delay={0} />
                    <Cloud x="70%" y="25%" delay={5} />
                    <Cloud x="40%" y="45%" delay={10} />
                </div>
            )}

            {activeState === 'Night' && (
                <div className="absolute inset-0">
                    <Star x="20%" y="20%" size={2} delay={0} />
                    <Star x="80%" y="40%" size={3} delay={1} />
                    <Star x="50%" y="70%" size={1} delay={2} />
                    <Star x="10%" y="60%" size={2} delay={3} />
                    <Star x="90%" y="10%" size={2} delay={4} />
                </div>
            )}

            {activeState === 'Sunset' && (
                <div className="absolute inset-0 bg-gradient-to-t from-transparent via-orange-500/10 to-transparent mix-blend-overlay" />
            )}
        </div>
    );
}

function Cloud({ x, y, delay }: { x: string; y: string; delay: number }) {
    return (
        <motion.div
            initial={{ x: '-20%' }}
            animate={{ x: '120%' }}
            transition={{ duration: 60, repeat: Infinity, ease: 'linear', delay }}
            className="absolute opacity-60 pointer-events-none"
            style={{ left: x, top: y }}
        >
            <div className="w-24 h-8 bg-white rounded-full blur-xl" />
        </motion.div>
    );
}

function Star({ x, y, size, delay }: { x: string; y: string; size: number; delay: number }) {
    return (
        <motion.div
            initial={{ opacity: 0.2 }}
            animate={{ opacity: [0.2, 0.8, 0.2] }}
            transition={{ duration: 3, repeat: Infinity, delay }}
            className="absolute bg-white rounded-full"
            style={{
                left: x,
                top: y,
                width: size,
                height: size,
                boxShadow: '0 0 5px white'
            }}
        />
    );
}
