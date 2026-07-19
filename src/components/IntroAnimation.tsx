"use client";

import React, { useEffect, useState } from 'react';
import { m, LazyMotion, domAnimation, AnimatePresence } from 'motion/react';

interface IntroAnimationProps {
  onComplete?: () => void;
}

export default function IntroAnimation({ onComplete }: IntroAnimationProps) {
    const [show, setShow] = useState(true);

    useEffect(() => {
        const alreadySeen = !!sessionStorage.getItem('kickpool_intro_played');

        if (!alreadySeen) {
            setShow(true);
            const timer = setTimeout(() => {
                setShow(false);
                sessionStorage.setItem('kickpool_intro_played', 'true');
                onComplete?.();
            }, 3000);
            return () => clearTimeout(timer);
        } else {
            setShow(false);
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
                        className="intro-overlay fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-gray-950"
                    >
                        <div className="relative z-10 flex flex-col items-center text-center">
                            {/* Animated football emoji */}
                            <m.div
                                initial={{ opacity: 0, y: 20, scale: 0.5 }}
                                animate={{ opacity: 1, y: 0, scale: 1, rotate: [0, -15, 15, -10, 10, 0] }}
                                transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
                                className="mb-6 text-7xl select-none"
                                aria-hidden="true"
                            >
                                ⚽
                            </m.div>

                            <m.div className="overflow-hidden">
                                <m.h1
                                    initial={{ y: "100%" }}
                                    animate={{ y: 0 }}
                                    transition={{ delay: 0.4, duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
                                    className="text-4xl md:text-5xl font-black tracking-tight text-white"
                                >
                                    Welcome to <span className="text-purple-400">KickPool</span>.
                                </m.h1>
                            </m.div>

                            <m.div className="overflow-hidden mt-3">
                                <m.p
                                    initial={{ y: "100%" }}
                                    animate={{ y: 0 }}
                                    transition={{ delay: 0.5, duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
                                    className="text-lg md:text-xl text-gray-400"
                                >
                                    Predict. Compete. Win USDC. ⚡
                                </m.p>
                            </m.div>

                            <m.div
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: 1 }}
                                transition={{ delay: 0.8, duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
                                className="h-1 mt-8 w-16 bg-purple-500 rounded-full"
                            />
                        </div>
                    </m.div>
                )}
            </AnimatePresence>
        </LazyMotion>
    );
}
