"use client";

import React, { memo } from 'react';
import { usePokemonTheme } from '@/components/PokemonThemeProvider';

/**
 * Cute Pixel Cat Mascot - A theme-aware pixel art cat
 * Changes color based on the current theme!
 */

interface PixelCatMascotProps {
  size?: number;
  className?: string;
  variant?: 'default' | 'happy' | 'sleepy' | 'wink';
  animate?: boolean;
}

function PixelCatMascot({ 
  size = 64, 
  className = '', 
  variant = 'default',
  animate = true 
}: PixelCatMascotProps) {
  const { currentTheme } = usePokemonTheme();
  const primaryColor = currentTheme.colors.primary;
  const secondaryColor = currentTheme.colors.secondary;
  const accentColor = currentTheme.colors.accent;
  
  // Cute cat face variants
  const renderCat = () => {
    switch (variant) {
      case 'happy':
        return (
          <svg viewBox="0 0 32 32" fill="none" style={{ width: size, height: size }}>
            {/* Ears */}
            <polygon points="4,12 8,2 12,12" fill={primaryColor} />
            <polygon points="20,12 24,2 28,12" fill={primaryColor} />
            <polygon points="6,11 8,5 10,11" fill={accentColor} />
            <polygon points="22,11 24,5 26,11" fill={accentColor} />
            
            {/* Face */}
            <ellipse cx="16" cy="18" rx="12" ry="10" fill={primaryColor} />
            
            {/* Inner face / cheeks */}
            <ellipse cx="16" cy="20" rx="10" ry="7" fill={accentColor} opacity="0.3" />
            
            {/* Happy closed eyes ^_^ */}
            <path d="M8 16 Q10 13 12 16" stroke={secondaryColor} strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M20 16 Q22 13 24 16" stroke={secondaryColor} strokeWidth="2" fill="none" strokeLinecap="round" />
            
            {/* Blush */}
            <circle cx="7" cy="20" r="2" fill="#FFB6C1" opacity="0.6" />
            <circle cx="25" cy="20" r="2" fill="#FFB6C1" opacity="0.6" />
            
            {/* Nose */}
            <ellipse cx="16" cy="20" rx="2" ry="1.5" fill="#FFB6C1" />
            
            {/* Smile */}
            <path d="M12 23 Q16 27 20 23" stroke={secondaryColor} strokeWidth="1.5" fill="none" strokeLinecap="round" />
            
            {/* Whiskers */}
            <line x1="2" y1="18" x2="8" y2="19" stroke={secondaryColor} strokeWidth="1" opacity="0.5" />
            <line x1="2" y1="21" x2="8" y2="21" stroke={secondaryColor} strokeWidth="1" opacity="0.5" />
            <line x1="24" y1="19" x2="30" y2="18" stroke={secondaryColor} strokeWidth="1" opacity="0.5" />
            <line x1="24" y1="21" x2="30" y2="21" stroke={secondaryColor} strokeWidth="1" opacity="0.5" />
          </svg>
        );
      
      case 'sleepy':
        return (
          <svg viewBox="0 0 32 32" fill="none" style={{ width: size, height: size }}>
            {/* Ears */}
            <polygon points="4,12 8,2 12,12" fill={primaryColor} />
            <polygon points="20,12 24,2 28,12" fill={primaryColor} />
            <polygon points="6,11 8,5 10,11" fill={accentColor} />
            <polygon points="22,11 24,5 26,11" fill={accentColor} />
            
            {/* Face */}
            <ellipse cx="16" cy="18" rx="12" ry="10" fill={primaryColor} />
            
            {/* Sleepy closed eyes - */}
            <line x1="8" y1="16" x2="13" y2="16" stroke={secondaryColor} strokeWidth="2" strokeLinecap="round" />
            <line x1="19" y1="16" x2="24" y2="16" stroke={secondaryColor} strokeWidth="2" strokeLinecap="round" />
            
            {/* Blush */}
            <circle cx="7" cy="20" r="2" fill="#FFB6C1" opacity="0.6" />
            <circle cx="25" cy="20" r="2" fill="#FFB6C1" opacity="0.6" />
            
            {/* Nose */}
            <ellipse cx="16" cy="20" rx="2" ry="1.5" fill="#FFB6C1" />
            
            {/* Sleepy mouth */}
            <ellipse cx="16" cy="24" rx="2" ry="1" fill={secondaryColor} opacity="0.5" />
            
            {/* Zzz */}
            <text x="26" y="8" fontSize="6" fill={primaryColor} fontWeight="bold">z</text>
            <text x="28" y="5" fontSize="5" fill={primaryColor} fontWeight="bold">z</text>
          </svg>
        );
      
      case 'wink':
        return (
          <svg viewBox="0 0 32 32" fill="none" style={{ width: size, height: size }}>
            {/* Ears */}
            <polygon points="4,12 8,2 12,12" fill={primaryColor} />
            <polygon points="20,12 24,2 28,12" fill={primaryColor} />
            <polygon points="6,11 8,5 10,11" fill={accentColor} />
            <polygon points="22,11 24,5 26,11" fill={accentColor} />
            
            {/* Face */}
            <ellipse cx="16" cy="18" rx="12" ry="10" fill={primaryColor} />
            
            {/* Open eye */}
            <ellipse cx="10" cy="16" rx="3" ry="3" fill="white" />
            <ellipse cx="10" cy="16" rx="2" ry="2" fill={secondaryColor} />
            <circle cx="9" cy="15" r="1" fill="white" />
            
            {/* Winking eye ^_^ */}
            <path d="M20 16 Q22 13 24 16" stroke={secondaryColor} strokeWidth="2" fill="none" strokeLinecap="round" />
            
            {/* Blush */}
            <circle cx="7" cy="20" r="2" fill="#FFB6C1" opacity="0.6" />
            <circle cx="25" cy="20" r="2" fill="#FFB6C1" opacity="0.6" />
            
            {/* Nose */}
            <ellipse cx="16" cy="20" rx="2" ry="1.5" fill="#FFB6C1" />
            
            {/* Smile */}
            <path d="M12 23 Q16 26 20 23" stroke={secondaryColor} strokeWidth="1.5" fill="none" strokeLinecap="round" />
            
            {/* Whiskers */}
            <line x1="2" y1="18" x2="8" y2="19" stroke={secondaryColor} strokeWidth="1" opacity="0.5" />
            <line x1="2" y1="21" x2="8" y2="21" stroke={secondaryColor} strokeWidth="1" opacity="0.5" />
            <line x1="24" y1="19" x2="30" y2="18" stroke={secondaryColor} strokeWidth="1" opacity="0.5" />
            <line x1="24" y1="21" x2="30" y2="21" stroke={secondaryColor} strokeWidth="1" opacity="0.5" />
          </svg>
        );
      
      default:
        return (
          <svg viewBox="0 0 32 32" fill="none" style={{ width: size, height: size }}>
            {/* Ears */}
            <polygon points="4,12 8,2 12,12" fill={primaryColor} />
            <polygon points="20,12 24,2 28,12" fill={primaryColor} />
            {/* Inner ears */}
            <polygon points="6,11 8,5 10,11" fill={accentColor} />
            <polygon points="22,11 24,5 26,11" fill={accentColor} />
            
            {/* Face */}
            <ellipse cx="16" cy="18" rx="12" ry="10" fill={primaryColor} />
            
            {/* Eyes */}
            <ellipse cx="10" cy="16" rx="3" ry="3.5" fill="white" />
            <ellipse cx="22" cy="16" rx="3" ry="3.5" fill="white" />
            <ellipse cx="10" cy="16" rx="2" ry="2.5" fill={secondaryColor} />
            <ellipse cx="22" cy="16" rx="2" ry="2.5" fill={secondaryColor} />
            {/* Eye shine */}
            <circle cx="9" cy="15" r="1" fill="white" />
            <circle cx="21" cy="15" r="1" fill="white" />
            
            {/* Blush */}
            <circle cx="6" cy="20" r="2" fill="#FFB6C1" opacity="0.5" />
            <circle cx="26" cy="20" r="2" fill="#FFB6C1" opacity="0.5" />
            
            {/* Nose */}
            <ellipse cx="16" cy="20" rx="2" ry="1.5" fill="#FFB6C1" />
            
            {/* Mouth */}
            <path d="M14 22 L16 24 L18 22" stroke={secondaryColor} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            
            {/* Whiskers */}
            <line x1="2" y1="18" x2="7" y2="19" stroke={secondaryColor} strokeWidth="1" opacity="0.4" />
            <line x1="2" y1="21" x2="7" y2="20" stroke={secondaryColor} strokeWidth="1" opacity="0.4" />
            <line x1="25" y1="19" x2="30" y2="18" stroke={secondaryColor} strokeWidth="1" opacity="0.4" />
            <line x1="25" y1="20" x2="30" y2="21" stroke={secondaryColor} strokeWidth="1" opacity="0.4" />
          </svg>
        );
    }
  };

  return (
    <div 
      className={`inline-flex items-center justify-center ${animate ? 'transition-all duration-300' : ''} ${className}`}
      style={{ imageRendering: 'auto' }}
    >
      {renderCat()}
    </div>
  );
}

export default memo(PixelCatMascot);
