"use client";

import React, { memo } from 'react';
import { usePokemonTheme } from '@/components/PokemonThemeProvider';

/**
 * Cute Pixel Cat Sprites - Adorable cat mascots for CinePurr
 * These are simple pixel art cats that match the retro aesthetic
 */

interface PixelCatSpriteProps {
  size?: number;
  className?: string;
  variant?: 'sitting' | 'happy' | 'sleepy' | 'wink' | 'watching';
  animate?: boolean;
}

// Cute pixel cat SVGs - hand-crafted for CinePurr!
function PixelCatSprite({ 
  size = 64, 
  className = '', 
  variant = 'sitting',
  animate = true 
}: PixelCatSpriteProps) {
  const { currentTheme } = usePokemonTheme();
  const primaryColor = currentTheme.colors.primary;
  const secondaryColor = currentTheme.colors.secondary;
  
  const animationClass = animate ? 'animate-bounce-subtle' : '';

  // All cats share this cute style
  const renderCat = () => {
    switch (variant) {
      case 'happy':
        // Happy cat with closed happy eyes ^_^
        return (
          <svg viewBox="0 0 16 16" style={{ width: size, height: size }} className={animationClass}>
            {/* Body */}
            <rect x="4" y="8" width="8" height="6" fill={primaryColor} />
            {/* Head */}
            <rect x="3" y="3" width="10" height="7" fill={primaryColor} />
            {/* Left ear */}
            <rect x="3" y="1" width="2" height="3" fill={primaryColor} />
            <rect x="4" y="2" width="1" height="1" fill="#FFB6C1" />
            {/* Right ear */}
            <rect x="11" y="1" width="2" height="3" fill={primaryColor} />
            <rect x="11" y="2" width="1" height="1" fill="#FFB6C1" />
            {/* Happy eyes ^_^ */}
            <rect x="5" y="5" width="1" height="1" fill={secondaryColor} />
            <rect x="6" y="4" width="1" height="1" fill={secondaryColor} />
            <rect x="9" y="4" width="1" height="1" fill={secondaryColor} />
            <rect x="10" y="5" width="1" height="1" fill={secondaryColor} />
            {/* Nose */}
            <rect x="7" y="6" width="2" height="1" fill="#FFB6C1" />
            {/* Smile */}
            <rect x="6" y="8" width="1" height="1" fill={secondaryColor} />
            <rect x="7" y="9" width="2" height="1" fill={secondaryColor} />
            <rect x="9" y="8" width="1" height="1" fill={secondaryColor} />
            {/* Blush */}
            <rect x="4" y="7" width="1" height="1" fill="#FFB6C1" opacity="0.7" />
            <rect x="11" y="7" width="1" height="1" fill="#FFB6C1" opacity="0.7" />
            {/* Tail */}
            <rect x="12" y="11" width="2" height="1" fill={primaryColor} />
            <rect x="13" y="10" width="1" height="1" fill={primaryColor} />
            {/* Paws */}
            <rect x="4" y="14" width="2" height="1" fill={secondaryColor} />
            <rect x="10" y="14" width="2" height="1" fill={secondaryColor} />
          </svg>
        );

      case 'sleepy':
        // Sleepy cat with - - eyes
        return (
          <svg viewBox="0 0 16 16" style={{ width: size, height: size }} className={animationClass}>
            {/* Body - curled up */}
            <rect x="3" y="9" width="10" height="5" fill={primaryColor} />
            {/* Head */}
            <rect x="3" y="4" width="8" height="6" fill={primaryColor} />
            {/* Left ear */}
            <rect x="3" y="2" width="2" height="3" fill={primaryColor} />
            <rect x="4" y="3" width="1" height="1" fill="#FFB6C1" />
            {/* Right ear */}
            <rect x="9" y="2" width="2" height="3" fill={primaryColor} />
            <rect x="9" y="3" width="1" height="1" fill="#FFB6C1" />
            {/* Closed eyes - - */}
            <rect x="4" y="6" width="2" height="1" fill={secondaryColor} />
            <rect x="8" y="6" width="2" height="1" fill={secondaryColor} />
            {/* Nose */}
            <rect x="6" y="7" width="2" height="1" fill="#FFB6C1" />
            {/* Zzz */}
            <text x="11" y="4" fontSize="3" fill={primaryColor} fontWeight="bold">z</text>
            <text x="13" y="2" fontSize="2" fill={primaryColor} fontWeight="bold">z</text>
            {/* Tail wrapped around */}
            <rect x="11" y="12" width="3" height="1" fill={primaryColor} />
            <rect x="13" y="11" width="1" height="1" fill={primaryColor} />
          </svg>
        );

      case 'wink':
        // Winking cat ;)
        return (
          <svg viewBox="0 0 16 16" style={{ width: size, height: size }} className={animationClass}>
            {/* Body */}
            <rect x="4" y="8" width="8" height="6" fill={primaryColor} />
            {/* Head */}
            <rect x="3" y="3" width="10" height="7" fill={primaryColor} />
            {/* Left ear */}
            <rect x="3" y="1" width="2" height="3" fill={primaryColor} />
            <rect x="4" y="2" width="1" height="1" fill="#FFB6C1" />
            {/* Right ear */}
            <rect x="11" y="1" width="2" height="3" fill={primaryColor} />
            <rect x="11" y="2" width="1" height="1" fill="#FFB6C1" />
            {/* Open eye */}
            <rect x="5" y="5" width="2" height="2" fill="white" />
            <rect x="5" y="5" width="1" height="1" fill={secondaryColor} />
            {/* Winking eye ^_^ */}
            <rect x="10" y="5" width="1" height="1" fill={secondaryColor} />
            <rect x="11" y="6" width="1" height="1" fill={secondaryColor} />
            {/* Nose */}
            <rect x="7" y="7" width="2" height="1" fill="#FFB6C1" />
            {/* Smile */}
            <rect x="7" y="8" width="2" height="1" fill={secondaryColor} />
            {/* Blush */}
            <rect x="4" y="7" width="1" height="1" fill="#FFB6C1" opacity="0.7" />
            <rect x="11" y="7" width="1" height="1" fill="#FFB6C1" opacity="0.7" />
            {/* Tail */}
            <rect x="12" y="11" width="2" height="1" fill={primaryColor} />
            <rect x="13" y="10" width="1" height="1" fill={primaryColor} />
            {/* Paws */}
            <rect x="4" y="14" width="2" height="1" fill={secondaryColor} />
            <rect x="10" y="14" width="2" height="1" fill={secondaryColor} />
          </svg>
        );

      case 'watching':
        // Cat watching a screen (perfect for CinePurr!)
        return (
          <svg viewBox="0 0 16 16" style={{ width: size, height: size }} className={animationClass}>
            {/* Body */}
            <rect x="4" y="8" width="8" height="6" fill={primaryColor} />
            {/* Head */}
            <rect x="3" y="3" width="10" height="7" fill={primaryColor} />
            {/* Left ear */}
            <rect x="3" y="1" width="2" height="3" fill={primaryColor} />
            <rect x="4" y="2" width="1" height="1" fill="#FFB6C1" />
            {/* Right ear */}
            <rect x="11" y="1" width="2" height="3" fill={primaryColor} />
            <rect x="11" y="2" width="1" height="1" fill="#FFB6C1" />
            {/* Big sparkly eyes (watching something!) */}
            <rect x="4" y="4" width="3" height="3" fill="white" />
            <rect x="5" y="5" width="2" height="2" fill={secondaryColor} />
            <rect x="5" y="5" width="1" height="1" fill="white" />
            <rect x="9" y="4" width="3" height="3" fill="white" />
            <rect x="10" y="5" width="2" height="2" fill={secondaryColor} />
            <rect x="10" y="5" width="1" height="1" fill="white" />
            {/* Nose */}
            <rect x="7" y="7" width="2" height="1" fill="#FFB6C1" />
            {/* Little mouth */}
            <rect x="7" y="8" width="1" height="1" fill={secondaryColor} />
            <rect x="8" y="8" width="1" height="1" fill={secondaryColor} />
            {/* Tail */}
            <rect x="12" y="11" width="2" height="1" fill={primaryColor} />
            <rect x="13" y="10" width="1" height="2" fill={primaryColor} />
            {/* Paws */}
            <rect x="4" y="14" width="2" height="1" fill={secondaryColor} />
            <rect x="10" y="14" width="2" height="1" fill={secondaryColor} />
          </svg>
        );

      case 'sitting':
      default:
        // Default sitting cat
        return (
          <svg viewBox="0 0 16 16" style={{ width: size, height: size }} className={animationClass}>
            {/* Body */}
            <rect x="4" y="8" width="8" height="6" fill={primaryColor} />
            {/* Head */}
            <rect x="3" y="3" width="10" height="7" fill={primaryColor} />
            {/* Left ear */}
            <rect x="3" y="1" width="2" height="3" fill={primaryColor} />
            <rect x="4" y="2" width="1" height="1" fill="#FFB6C1" />
            {/* Right ear */}
            <rect x="11" y="1" width="2" height="3" fill={primaryColor} />
            <rect x="11" y="2" width="1" height="1" fill="#FFB6C1" />
            {/* Eyes */}
            <rect x="5" y="5" width="2" height="2" fill="white" />
            <rect x="5" y="5" width="1" height="1" fill={secondaryColor} />
            <rect x="9" y="5" width="2" height="2" fill="white" />
            <rect x="10" y="5" width="1" height="1" fill={secondaryColor} />
            {/* Nose */}
            <rect x="7" y="7" width="2" height="1" fill="#FFB6C1" />
            {/* Mouth */}
            <rect x="7" y="8" width="1" height="1" fill={secondaryColor} />
            <rect x="8" y="8" width="1" height="1" fill={secondaryColor} />
            {/* Whiskers (subtle) */}
            <rect x="2" y="7" width="2" height="1" fill={secondaryColor} opacity="0.3" />
            <rect x="12" y="7" width="2" height="1" fill={secondaryColor} opacity="0.3" />
            {/* Tail */}
            <rect x="12" y="11" width="2" height="1" fill={primaryColor} />
            <rect x="13" y="10" width="1" height="1" fill={primaryColor} />
            {/* Paws */}
            <rect x="4" y="14" width="2" height="1" fill={secondaryColor} />
            <rect x="10" y="14" width="2" height="1" fill={secondaryColor} />
          </svg>
        );
    }
  };

  return (
    <div className={`inline-block ${className}`} style={{ imageRendering: 'pixelated' }}>
      {renderCat()}
    </div>
  );
}

export default memo(PixelCatSprite);
