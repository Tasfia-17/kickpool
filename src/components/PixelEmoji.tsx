"use client";

import React, { memo } from 'react';

// Cat-themed emoji mappings
const EMOJI_TO_CAT: Record<string, { seed: string; name: string }> = {
  '😀': { seed: 'happy-cat', name: 'Happy Cat' },
  '😂': { seed: 'laughing-cat', name: 'Laughing Cat' },
  '😍': { seed: 'love-cat', name: 'Love Cat' },
  '🐱': { seed: 'default-cat', name: 'Cat' },
  '😺': { seed: 'happy-cat', name: 'Happy Cat' },
  '😻': { seed: 'heart-eyes-cat', name: 'Heart Eyes Cat' },
  '🙀': { seed: 'scared-cat', name: 'Scared Cat' },
  '😿': { seed: 'crying-cat', name: 'Crying Cat' },
  '😾': { seed: 'angry-cat', name: 'Angry Cat' },
  '🐾': { seed: 'pawprint', name: 'Paw Print' },
};

// Get cat sprite URL using DiceBear (fun-emoji is cute and friendly!)
const getCatSprite = (seed: string) => 
  `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${seed}&backgroundColor=transparent`;

interface PixelEmojiProps {
  emoji: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  fallback?: boolean;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-base',
  sm: 'w-8 h-8 text-xl',
  md: 'w-10 h-10 text-2xl',
  lg: 'w-12 h-12 text-3xl',
};

// Simplified - just render emojis directly (no Pokemon replacement)
function PixelEmoji({ emoji, size = 'sm', className = '', fallback = true }: PixelEmojiProps) {
  return (
    <span className={`inline-flex items-center justify-center ${sizeClasses[size]} ${className}`}>
      {emoji}
    </span>
  );
}

export default memo(PixelEmoji);
export { EMOJI_TO_CAT, getCatSprite };
