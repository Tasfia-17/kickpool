"use client";

import React, { useEffect, useState } from 'react';
import { m, LazyMotion, domAnimation, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import { usePokemonTheme } from '@/components/PokemonThemeProvider';

interface IntroAnimationProps {
  onComplete?: () => void;
}

export default function IntroAnimation({ onComplete }: IntroAnimationProps) {
    // We now start with true and hide it instantly via inline script in layout.tsx
    // to avoid React hydration mismatches while ensuring fast initial paint.
    const [show, setShow] = useState(true);
    const { currentTheme } = usePokemonTheme();

    useEffect(() => {
        const alreadySeen = !!sessionStorage.getItem('cinepurr_intro_played');

        if (!alreadySeen) {
            // First-time visitor — show the intro overlay
            setShow(true);
            const timer = setTimeout(() => {
                setShow(false);
                sessionStorage.setItem('cinepurr_intro_played', 'true');
                onComplete?.();
            }, 3000);
            return () => clearTimeout(timer);
        } else {
            // Returning visitor — skip intro, call onComplete immediately
            onComplete?.();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <LazyMotion features={domAnimation}>
            <AnimatePresence>
                {show && (
                    <m.div
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0, y: "-100%" }}
                        transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
                        className="intro-overlay fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-white dark:bg-[#111]"
                    >
                        <div className="relative z-10 flex flex-col items-center text-center">
                            <m.div
                                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
                                className="mb-6 h-32 w-32 relative"
                            >
                                {/* A cute running pixel GIF for the intro */}
                                <Image
                                    src="/sprites/animated/25.gif"
                                    alt="Running Pikachu"
                                    fill
                                    priority
                                    className="object-contain"
                                    style={{ imageRendering: 'pixelated' }}
                                />
                            </m.div>

                            <m.div className="overflow-hidden">
                                <m.h1
                                    initial={{ y: "100%" }}
                                    animate={{ y: 0 }}
                                    transition={{ delay: 0.4, duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
                                    className="text-4xl md:text-5xl font-black font-mono tracking-tight text-black dark:text-white"
                                >
                                    Welcome to <span style={{ color: currentTheme.colors.primary }}>CinePurr</span>.
                                </m.h1>
                            </m.div>

                            <m.div className="overflow-hidden mt-3">
                                <m.p
                                    initial={{ y: "100%" }}
                                    animate={{ y: 0 }}
                                    transition={{ delay: 0.5, duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
                                    className="text-lg md:text-xl text-gray-500 font-mono"
                                >
                                    Watch together. Chat together.
                                </m.p>
                            </m.div>

                            <m.div
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: 1 }}
                                transition={{ delay: 0.8, duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
                                className="h-1 mt-8 w-16"
                                style={{ backgroundColor: currentTheme.colors.primary }}
                            />
                        </div>
                    </m.div>
                )}
            </AnimatePresence>
        </LazyMotion>
    );
}
