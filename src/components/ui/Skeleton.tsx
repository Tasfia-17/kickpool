'use client';

import React from 'react';
import { usePokemonTheme } from '@/components/PokemonThemeProvider';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'circular' | 'rectangular';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width = '100%',
  height = '20px',
  variant = 'rectangular'
}) => {
  const { isDarkMode, currentTheme } = usePokemonTheme();

  return (
    <div 
      className={`relative overflow-hidden ${className} 
        ${variant === 'circular' ? 'rounded-full' : 'rounded-md'}
        ${isDarkMode ? 'bg-white/5' : 'bg-black/5'}
      `}
      style={{ width, height }}
    >
      {/* Wireframe Border (Subtle) */}
      <div className={`absolute inset-0 border-2 border-dashed opacity-20 ${isDarkMode ? 'border-white' : 'border-black'}`} />

      {/* The Scanner Bar */}
      <div className="absolute inset-0 animate-skeleton-scan">
         <div 
           className="h-full w-1/2 opacity-20 blur-md transform -skew-x-12"
           style={{ 
             background: `linear-gradient(90deg, transparent, ${currentTheme.colors.primary}, transparent)` 
           }} 
         />
      </div>
    </div>
  );
};

// Profile-specific skeleton loader
export const ProfileSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { isDarkMode, currentTheme } = usePokemonTheme();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Profile Card Skeleton */}
      <div className="border-4 rounded-lg p-6" style={{ 
        borderColor: isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
        backgroundColor: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)'
      }}>
        <div className="flex items-center gap-4 mb-4">
          <Skeleton variant="circular" width={80} height={80} />
          <div className="flex-1 space-y-2">
            <Skeleton width="60%" height={24} />
            <Skeleton width="40%" height={16} />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton width="100%" height={16} />
          <Skeleton width="80%" height={16} />
        </div>
      </div>

      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="border-4 rounded-lg p-4" style={{ 
            borderColor: isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
            backgroundColor: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)'
          }}>
            <Skeleton width="100%" height={20} className="mb-2" />
            <Skeleton width="60%" height={16} />
          </div>
        ))}
      </div>

      {/* Content Sections Skeleton */}
      <div className="space-y-4">
        <Skeleton width="30%" height={24} />
        <div className="space-y-2">
          <Skeleton width="100%" height={16} />
          <Skeleton width="95%" height={16} />
          <Skeleton width="90%" height={16} />
        </div>
      </div>
    </div>
  );
};
