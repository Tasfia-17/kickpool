"use client";

import React, { useEffect, useRef } from 'react';
import { usePokemonTheme } from './PokemonThemeProvider';

interface Particle {
    x: number;
    y: number;
    size: number;
    speedX: number;
    speedY: number;
    life: number;
    maxLife: number;
    color: string;
}

export default function CursorTrail() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { currentTheme } = usePokemonTheme();

    useEffect(() => {
        // Skip entirely on touch devices — no cursor, just wastes GPU/CPU at 60fps
        const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
        if (isTouchDevice) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = window.innerWidth;
        let height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;

        let particles: Particle[] = [];
        let mouse = { x: -100, y: -100 };
        let isMoving = false;
        let timeoutId: NodeJS.Timeout;
        let rafId: number;

        const handleMouseMove = (e: MouseEvent) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
            isMoving = true;

            // Add a particle on mouse move
            if (Math.random() > 0.3) {
                addParticle(mouse.x, mouse.y);
            }

            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                isMoving = false;
            }, 100);
        };

        const handleResize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('resize', handleResize);

        const addParticle = (x: number, y: number) => {
            const size = Math.random() * 4 + 2;
            const speedX = (Math.random() - 0.5) * 2;
            const speedY = (Math.random() - 0.5) * 2 + 1; // Slight downward pull gravity
            const life = Math.random() * 30 + 30; // Frames to live

            particles.push({
                x,
                y,
                size,
                speedX,
                speedY,
                life,
                maxLife: life,
                color: currentTheme.colors.primary,
            });
        };

        const animate = () => {
            ctx.clearRect(0, 0, width, height);

            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];

                ctx.fillStyle = p.color;

                // Calculate opacity based on life
                const opacity = Math.max(0, p.life / p.maxLife);
                ctx.globalAlpha = opacity;

                // Draw pixel block
                ctx.fillRect(p.x, p.y, p.size, p.size);

                // Update position
                p.x += p.speedX;
                p.y += p.speedY;
                p.life--;

                // Remove dead particles
                if (p.life <= 0) {
                    particles.splice(i, 1);
                    i--;
                }
            }

            ctx.globalAlpha = 1;
            rafId = requestAnimationFrame(animate);
        };

        rafId = requestAnimationFrame(animate);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('resize', handleResize);
            clearTimeout(timeoutId);
            cancelAnimationFrame(rafId);
        };
    }, [currentTheme]);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-[9998]"
            style={{ zIndex: 9998 }}
        />
    );
}
