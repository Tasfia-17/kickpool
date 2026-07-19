'use client';

import React, { useState, useRef, useEffect } from 'react';

export type Language = 'en' | 'tr';

export interface LanguageSwitcherProps {
  value: Language;
  onChange: (lang: Language) => void;
}

// Generate static noise sound effect using Web Audio API
const playStaticNoise = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const bufferSize = audioContext.sampleRate * 0.1; // 100ms
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    // Generate white noise
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = audioContext.createBufferSource();
    const gainNode = audioContext.createGain();
    
    source.buffer = buffer;
    gainNode.gain.value = 0.1; // Lower volume
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    source.start(0);
    source.stop(audioContext.currentTime + 0.1);
  } catch (error) {
    // Fallback: silent if Web Audio API not available
    console.debug('Audio context not available');
  }
};

const languages: { code: Language; name: string; flag: string }[] = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
];

export default function LanguageSwitcher({ value, onChange }: LanguageSwitcherProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [rotation, setRotation] = useState(0);
  const globeRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);

  // Get current language index
  const currentIndex = languages.findIndex(lang => lang.code === value);
  const currentLang = languages[currentIndex] || languages[0];

  // Handle click to cycle languages
  const handleClick = () => {
    const nextIndex = (currentIndex + 1) % languages.length;
    const nextLang = languages[nextIndex];
    onChange(nextLang.code);
    playStaticNoise();
    
    // Add rotation animation
    setRotation(prev => prev + 360);
  };

  // Animate rotation
  useEffect(() => {
    if (rotation > 0) {
      const animate = () => {
        if (globeRef.current) {
          const currentRotation = parseFloat(globeRef.current.style.transform.replace(/[^0-9.-]/g, '')) || 0;
          if (currentRotation < rotation) {
            const newRotation = Math.min(currentRotation + 20, rotation);
            globeRef.current.style.transform = `rotateY(${newRotation}deg)`;
            animationFrameRef.current = requestAnimationFrame(animate);
          } else {
            setRotation(0);
            if (globeRef.current) {
              globeRef.current.style.transform = 'rotateY(0deg)';
            }
          }
        }
      };
      animationFrameRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [rotation]);

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm font-bold" style={{ fontSize: '11px' }}>
        Language:
      </label>
      
      {/* Pixel-art Globe Hologram */}
      <button
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative flex items-center justify-center cursor-pointer transition-transform active:scale-95"
        style={{
          width: '48px',
          height: '48px',
          border: '2px solid #000',
          backgroundColor: '#1a1a2e',
          boxShadow: isHovered 
            ? '0 0 12px rgba(0, 255, 255, 0.6), inset 0 0 20px rgba(0, 255, 255, 0.2)' 
            : '0 0 8px rgba(0, 255, 255, 0.4), inset 0 0 15px rgba(0, 255, 255, 0.1)',
          imageRendering: 'pixelated',
        }}
        aria-label={`Switch language. Current: ${currentLang.name}`}
        title={`Click to switch language (Current: ${currentLang.name})`}
      >
        {/* Globe Wireframe (Pixel-art style) */}
        <div
          ref={globeRef}
          className="relative w-full h-full flex items-center justify-center"
          style={{
            transformStyle: 'preserve-3d',
            transition: rotation === 0 ? 'transform 0.3s ease-out' : 'none',
          }}
        >
          {/* Globe Icon - Pixel-art style */}
          <div
            className="relative"
            style={{
              width: '32px',
              height: '32px',
              fontSize: '24px',
              filter: 'drop-shadow(0 0 4px rgba(0, 255, 255, 0.8))',
            }}
          >
            {currentLang.flag}
          </div>

          {/* Holographic scan lines effect */}
          <div
            className="absolute inset-0 pointer-events-none language-globe-scan"
            style={{
              background: 'linear-gradient(180deg, transparent 0%, rgba(0, 255, 255, 0.1) 50%, transparent 100%)',
              mixBlendMode: 'screen',
            }}
          />

          {/* Glow effect */}
          {isHovered && (
            <div
              className="absolute inset-0 pointer-events-none language-globe-pulse"
              style={{
                background: 'radial-gradient(circle, rgba(0, 255, 255, 0.3) 0%, transparent 70%)',
              }}
            />
          )}
        </div>

        {/* Language label (appears on hover) */}
        {isHovered && (
          <div
            className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 px-2 py-1 text-xs font-bold whitespace-nowrap pointer-events-none z-10"
            style={{
              backgroundColor: '#000',
              color: '#00ffff',
              border: '2px solid #00ffff',
              boxShadow: '0 0 8px rgba(0, 255, 255, 0.6)',
              fontSize: '10px',
            }}
          >
            {currentLang.name}
          </div>
        )}
      </button>

      {/* Current language indicator */}
      <span
        className="text-xs font-bold px-2 py-1 border-2 border-black"
        style={{
          backgroundColor: '#fff',
          color: '#000',
          fontSize: '10px',
          minWidth: '60px',
          textAlign: 'center',
        }}
      >
        {currentLang.code.toUpperCase()}
      </span>
    </div>
  );
}
