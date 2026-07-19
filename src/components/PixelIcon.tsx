"use client";

import React, { memo } from 'react';

/**
 * Pixel Icon System - SVG-based pixelated icons for consistent retro aesthetic
 * Each icon is designed on an 8x8 or 16x16 grid for that authentic pixel look
 */

interface PixelIconProps {
  name: keyof typeof PIXEL_ICONS;
  size?: number;
  className?: string;
  color?: string;
}

// 16x16 pixel art icons as SVG paths
const PIXEL_ICONS = {
  // Cat face - our mascot
  cat: (
    <svg viewBox="0 0 16 16" fill="currentColor">
      <rect x="2" y="3" width="2" height="2"/>
      <rect x="12" y="3" width="2" height="2"/>
      <rect x="1" y="5" width="3" height="2"/>
      <rect x="12" y="5" width="3" height="2"/>
      <rect x="1" y="7" width="14" height="6"/>
      <rect x="2" y="13" width="12" height="1"/>
      <rect x="5" y="8" width="2" height="2" fill="var(--pixel-eye, #000)"/>
      <rect x="9" y="8" width="2" height="2" fill="var(--pixel-eye, #000)"/>
      <rect x="7" y="10" width="2" height="1" fill="var(--pixel-nose, #ffb6c1)"/>
      <rect x="5" y="11" width="1" height="1" fill="var(--pixel-whisker, #666)"/>
      <rect x="10" y="11" width="1" height="1" fill="var(--pixel-whisker, #666)"/>
    </svg>
  ),
  
  // Happy cat
  catHappy: (
    <svg viewBox="0 0 16 16" fill="currentColor">
      <rect x="2" y="3" width="2" height="2"/>
      <rect x="12" y="3" width="2" height="2"/>
      <rect x="1" y="5" width="3" height="2"/>
      <rect x="12" y="5" width="3" height="2"/>
      <rect x="1" y="7" width="14" height="6"/>
      <rect x="2" y="13" width="12" height="1"/>
      <rect x="5" y="8" width="2" height="1" fill="var(--pixel-eye, #000)"/>
      <rect x="9" y="8" width="2" height="1" fill="var(--pixel-eye, #000)"/>
      <rect x="5" y="9" width="1" height="1" fill="var(--pixel-eye, #000)"/>
      <rect x="10" y="9" width="1" height="1" fill="var(--pixel-eye, #000)"/>
      <rect x="7" y="10" width="2" height="1" fill="var(--pixel-nose, #ffb6c1)"/>
      <rect x="6" y="11" width="4" height="1" fill="var(--pixel-mouth, #000)"/>
    </svg>
  ),

  // Paw print
  paw: (
    <svg viewBox="0 0 16 16" fill="currentColor">
      <rect x="6" y="2" width="4" height="3"/>
      <rect x="2" y="5" width="3" height="3"/>
      <rect x="11" y="5" width="3" height="3"/>
      <rect x="4" y="9" width="8" height="5"/>
      <rect x="5" y="14" width="2" height="1"/>
      <rect x="9" y="14" width="2" height="1"/>
    </svg>
  ),

  // Star
  star: (
    <svg viewBox="0 0 16 16" fill="currentColor">
      <rect x="7" y="1" width="2" height="2"/>
      <rect x="6" y="3" width="4" height="2"/>
      <rect x="1" y="5" width="14" height="2"/>
      <rect x="2" y="7" width="12" height="2"/>
      <rect x="3" y="9" width="10" height="1"/>
      <rect x="4" y="10" width="3" height="2"/>
      <rect x="9" y="10" width="3" height="2"/>
      <rect x="3" y="12" width="2" height="2"/>
      <rect x="11" y="12" width="2" height="2"/>
    </svg>
  ),

  // Sparkle
  sparkle: (
    <svg viewBox="0 0 16 16" fill="currentColor">
      <rect x="7" y="0" width="2" height="3"/>
      <rect x="7" y="13" width="2" height="3"/>
      <rect x="0" y="7" width="3" height="2"/>
      <rect x="13" y="7" width="3" height="2"/>
      <rect x="3" y="3" width="2" height="2"/>
      <rect x="11" y="3" width="2" height="2"/>
      <rect x="3" y="11" width="2" height="2"/>
      <rect x="11" y="11" width="2" height="2"/>
      <rect x="6" y="6" width="4" height="4"/>
    </svg>
  ),

  // Movie/Film
  movie: (
    <svg viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="2" width="14" height="12"/>
      <rect x="2" y="3" width="2" height="2" fill="var(--pixel-hole, #000)"/>
      <rect x="2" y="7" width="2" height="2" fill="var(--pixel-hole, #000)"/>
      <rect x="2" y="11" width="2" height="2" fill="var(--pixel-hole, #000)"/>
      <rect x="12" y="3" width="2" height="2" fill="var(--pixel-hole, #000)"/>
      <rect x="12" y="7" width="2" height="2" fill="var(--pixel-hole, #000)"/>
      <rect x="12" y="11" width="2" height="2" fill="var(--pixel-hole, #000)"/>
      <rect x="5" y="4" width="6" height="8" fill="var(--pixel-screen, #333)"/>
    </svg>
  ),

  // TV/Monitor
  tv: (
    <svg viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="3" width="14" height="10"/>
      <rect x="2" y="4" width="10" height="8" fill="var(--pixel-screen, #333)"/>
      <rect x="13" y="5" width="1" height="1" fill="var(--pixel-led, #0f0)"/>
      <rect x="5" y="13" width="6" height="1"/>
      <rect x="4" y="14" width="8" height="1"/>
    </svg>
  ),

  // Trophy
  trophy: (
    <svg viewBox="0 0 16 16" fill="currentColor">
      <rect x="4" y="1" width="8" height="2"/>
      <rect x="3" y="3" width="10" height="5"/>
      <rect x="1" y="3" width="2" height="4"/>
      <rect x="13" y="3" width="2" height="4"/>
      <rect x="4" y="8" width="8" height="1"/>
      <rect x="5" y="9" width="6" height="1"/>
      <rect x="6" y="10" width="4" height="2"/>
      <rect x="7" y="12" width="2" height="1"/>
      <rect x="4" y="13" width="8" height="2"/>
    </svg>
  ),

  // Heart
  heart: (
    <svg viewBox="0 0 16 16" fill="currentColor">
      <rect x="2" y="3" width="4" height="2"/>
      <rect x="10" y="3" width="4" height="2"/>
      <rect x="1" y="5" width="6" height="3"/>
      <rect x="9" y="5" width="6" height="3"/>
      <rect x="1" y="8" width="14" height="2"/>
      <rect x="2" y="10" width="12" height="1"/>
      <rect x="3" y="11" width="10" height="1"/>
      <rect x="4" y="12" width="8" height="1"/>
      <rect x="5" y="13" width="6" height="1"/>
      <rect x="6" y="14" width="4" height="1"/>
      <rect x="7" y="15" width="2" height="1"/>
    </svg>
  ),

  // Party/Celebration
  party: (
    <svg viewBox="0 0 16 16" fill="currentColor">
      <rect x="4" y="1" width="2" height="1"/>
      <rect x="3" y="2" width="4" height="2"/>
      <rect x="2" y="4" width="6" height="3"/>
      <rect x="1" y="7" width="8" height="3"/>
      <rect x="0" y="10" width="10" height="3"/>
      <rect x="0" y="13" width="11" height="2"/>
      <rect x="11" y="2" width="2" height="2" fill="var(--pixel-confetti1, #ff6b6b)"/>
      <rect x="13" y="4" width="2" height="2" fill="var(--pixel-confetti2, #feca57)"/>
      <rect x="10" y="6" width="2" height="2" fill="var(--pixel-confetti3, #48dbfb)"/>
    </svg>
  ),

  // Play button
  play: (
    <svg viewBox="0 0 16 16" fill="currentColor">
      <rect x="4" y="2" width="2" height="12"/>
      <rect x="6" y="3" width="2" height="10"/>
      <rect x="8" y="4" width="2" height="8"/>
      <rect x="10" y="5" width="2" height="6"/>
      <rect x="12" y="6" width="2" height="4"/>
    </svg>
  ),

  // Users/Friends
  users: (
    <svg viewBox="0 0 16 16" fill="currentColor">
      <rect x="2" y="2" width="4" height="4"/>
      <rect x="1" y="7" width="6" height="2"/>
      <rect x="0" y="9" width="8" height="5"/>
      <rect x="10" y="2" width="4" height="4"/>
      <rect x="9" y="7" width="6" height="2"/>
      <rect x="8" y="9" width="8" height="5"/>
    </svg>
  ),

  // Crown (for VIP/Founder)
  crown: (
    <svg viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="5" width="2" height="2"/>
      <rect x="7" y="2" width="2" height="2"/>
      <rect x="13" y="5" width="2" height="2"/>
      <rect x="2" y="7" width="2" height="2"/>
      <rect x="6" y="4" width="4" height="2"/>
      <rect x="12" y="7" width="2" height="2"/>
      <rect x="1" y="9" width="14" height="5"/>
      <rect x="4" y="10" width="2" height="2" fill="var(--pixel-gem, #ff69b4)"/>
      <rect x="10" y="10" width="2" height="2" fill="var(--pixel-gem, #ff69b4)"/>
    </svg>
  ),

  // Message/Chat
  chat: (
    <svg viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="2" width="14" height="10"/>
      <rect x="2" y="3" width="12" height="8" fill="var(--pixel-bg, #1a1a2e)"/>
      <rect x="1" y="12" width="4" height="2"/>
      <rect x="1" y="14" width="2" height="1"/>
      <rect x="4" y="5" width="8" height="1" fill="var(--pixel-text, #888)"/>
      <rect x="4" y="7" width="6" height="1" fill="var(--pixel-text, #888)"/>
    </svg>
  ),

  // Settings/Gear
  settings: (
    <svg viewBox="0 0 16 16" fill="currentColor">
      <rect x="7" y="0" width="2" height="2"/>
      <rect x="7" y="14" width="2" height="2"/>
      <rect x="0" y="7" width="2" height="2"/>
      <rect x="14" y="7" width="2" height="2"/>
      <rect x="2" y="2" width="2" height="2"/>
      <rect x="12" y="2" width="2" height="2"/>
      <rect x="2" y="12" width="2" height="2"/>
      <rect x="12" y="12" width="2" height="2"/>
      <rect x="4" y="4" width="8" height="8"/>
      <rect x="6" y="6" width="4" height="4" fill="var(--pixel-bg, #1a1a2e)"/>
    </svg>
  ),

  // Home
  home: (
    <svg viewBox="0 0 16 16" fill="currentColor">
      <rect x="7" y="1" width="2" height="2"/>
      <rect x="5" y="3" width="6" height="2"/>
      <rect x="3" y="5" width="10" height="2"/>
      <rect x="1" y="7" width="14" height="2"/>
      <rect x="2" y="9" width="12" height="6"/>
      <rect x="6" y="11" width="4" height="4" fill="var(--pixel-door, #654321)"/>
    </svg>
  ),

  // Warning/Alert
  warning: (
    <svg viewBox="0 0 16 16" fill="currentColor">
      <rect x="7" y="1" width="2" height="2"/>
      <rect x="6" y="3" width="4" height="2"/>
      <rect x="5" y="5" width="6" height="2"/>
      <rect x="4" y="7" width="8" height="2"/>
      <rect x="3" y="9" width="10" height="2"/>
      <rect x="2" y="11" width="12" height="2"/>
      <rect x="1" y="13" width="14" height="2"/>
      <rect x="7" y="5" width="2" height="4" fill="var(--pixel-alert, #000)"/>
      <rect x="7" y="11" width="2" height="2" fill="var(--pixel-alert, #000)"/>
    </svg>
  ),

  // Check/Success
  check: (
    <svg viewBox="0 0 16 16" fill="currentColor">
      <rect x="12" y="2" width="2" height="2"/>
      <rect x="11" y="4" width="2" height="2"/>
      <rect x="10" y="6" width="2" height="2"/>
      <rect x="9" y="8" width="2" height="2"/>
      <rect x="8" y="10" width="2" height="2"/>
      <rect x="2" y="8" width="2" height="2"/>
      <rect x="3" y="9" width="2" height="2"/>
      <rect x="4" y="10" width="2" height="2"/>
      <rect x="5" y="11" width="2" height="2"/>
      <rect x="6" y="12" width="3" height="2"/>
    </svg>
  ),

  // X/Close
  close: (
    <svg viewBox="0 0 16 16" fill="currentColor">
      <rect x="2" y="2" width="2" height="2"/>
      <rect x="12" y="2" width="2" height="2"/>
      <rect x="4" y="4" width="2" height="2"/>
      <rect x="10" y="4" width="2" height="2"/>
      <rect x="6" y="6" width="4" height="4"/>
      <rect x="4" y="10" width="2" height="2"/>
      <rect x="10" y="10" width="2" height="2"/>
      <rect x="2" y="12" width="2" height="2"/>
      <rect x="12" y="12" width="2" height="2"/>
    </svg>
  ),

  // Refresh
  refresh: (
    <svg viewBox="0 0 16 16" fill="currentColor">
      <rect x="5" y="1" width="6" height="2"/>
      <rect x="3" y="3" width="2" height="2"/>
      <rect x="11" y="3" width="2" height="2"/>
      <rect x="1" y="5" width="2" height="6"/>
      <rect x="13" y="5" width="2" height="6"/>
      <rect x="3" y="11" width="2" height="2"/>
      <rect x="5" y="13" width="6" height="2"/>
      <rect x="11" y="9" width="4" height="2"/>
      <rect x="13" y="7" width="2" height="2"/>
    </svg>
  ),

  // Search
  search: (
    <svg viewBox="0 0 16 16" fill="currentColor">
      <rect x="4" y="1" width="5" height="2"/>
      <rect x="2" y="3" width="2" height="2"/>
      <rect x="9" y="3" width="2" height="2"/>
      <rect x="1" y="5" width="2" height="3"/>
      <rect x="10" y="5" width="2" height="3"/>
      <rect x="2" y="8" width="2" height="2"/>
      <rect x="9" y="8" width="2" height="2"/>
      <rect x="4" y="10" width="5" height="2"/>
      <rect x="10" y="10" width="2" height="2"/>
      <rect x="11" y="12" width="2" height="2"/>
      <rect x="12" y="14" width="2" height="2"/>
    </svg>
  ),

  // Fire/Flame (for streaks)
  fire: (
    <svg viewBox="0 0 16 16" fill="currentColor">
      <rect x="7" y="1" width="2" height="2"/>
      <rect x="6" y="3" width="4" height="2"/>
      <rect x="5" y="5" width="6" height="2"/>
      <rect x="4" y="7" width="8" height="2"/>
      <rect x="3" y="9" width="10" height="2"/>
      <rect x="2" y="11" width="12" height="2"/>
      <rect x="3" y="13" width="10" height="2"/>
      <rect x="4" y="15" width="8" height="1"/>
      <rect x="6" y="6" width="2" height="3" fill="var(--pixel-flame-inner, #feca57)"/>
      <rect x="7" y="9" width="2" height="2" fill="var(--pixel-flame-inner, #feca57)"/>
    </svg>
  ),

  // Bell (notifications)
  bell: (
    <svg viewBox="0 0 16 16" fill="currentColor">
      <rect x="7" y="1" width="2" height="2"/>
      <rect x="5" y="3" width="6" height="2"/>
      <rect x="4" y="5" width="8" height="2"/>
      <rect x="3" y="7" width="10" height="3"/>
      <rect x="2" y="10" width="12" height="2"/>
      <rect x="1" y="12" width="14" height="1"/>
      <rect x="6" y="13" width="4" height="2"/>
    </svg>
  ),

  // Gift/Crate
  gift: (
    <svg viewBox="0 0 16 16" fill="currentColor">
      <rect x="3" y="1" width="4" height="2"/>
      <rect x="9" y="1" width="4" height="2"/>
      <rect x="1" y="3" width="14" height="3"/>
      <rect x="7" y="3" width="2" height="3" fill="var(--pixel-ribbon, #ff69b4)"/>
      <rect x="2" y="6" width="12" height="9"/>
      <rect x="7" y="6" width="2" height="9" fill="var(--pixel-ribbon, #ff69b4)"/>
    </svg>
  ),

  // Dice
  dice: (
    <svg viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="1" width="14" height="14"/>
      <rect x="2" y="2" width="12" height="12" fill="var(--pixel-bg, #1a1a2e)"/>
      <rect x="4" y="4" width="2" height="2"/>
      <rect x="10" y="4" width="2" height="2"/>
      <rect x="7" y="7" width="2" height="2"/>
      <rect x="4" y="10" width="2" height="2"/>
      <rect x="10" y="10" width="2" height="2"/>
    </svg>
  ),

  // Music note
  music: (
    <svg viewBox="0 0 16 16" fill="currentColor">
      <rect x="5" y="1" width="8" height="2"/>
      <rect x="11" y="1" width="2" height="10"/>
      <rect x="5" y="1" width="2" height="12"/>
      <rect x="2" y="11" width="5" height="4"/>
      <rect x="8" y="9" width="5" height="4"/>
    </svg>
  ),

  // Wifi
  wifi: (
    <svg viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="4" width="2" height="2"/>
      <rect x="13" y="4" width="2" height="2"/>
      <rect x="3" y="2" width="10" height="2"/>
      <rect x="3" y="6" width="2" height="2"/>
      <rect x="11" y="6" width="2" height="2"/>
      <rect x="5" y="4" width="6" height="2"/>
      <rect x="5" y="8" width="2" height="2"/>
      <rect x="9" y="8" width="2" height="2"/>
      <rect x="6" y="6" width="4" height="2"/>
      <rect x="7" y="10" width="2" height="2"/>
      <rect x="7" y="13" width="2" height="2"/>
    </svg>
  ),

  // No Wifi
  wifiOff: (
    <svg viewBox="0 0 16 16" fill="currentColor">
      <rect x="3" y="2" width="10" height="2" opacity="0.3"/>
      <rect x="5" y="4" width="6" height="2" opacity="0.3"/>
      <rect x="6" y="6" width="4" height="2" opacity="0.3"/>
      <rect x="7" y="10" width="2" height="2" opacity="0.3"/>
      <rect x="2" y="2" width="2" height="2" fill="var(--pixel-error, #ff6b6b)"/>
      <rect x="4" y="4" width="2" height="2" fill="var(--pixel-error, #ff6b6b)"/>
      <rect x="6" y="6" width="2" height="2" fill="var(--pixel-error, #ff6b6b)"/>
      <rect x="8" y="8" width="2" height="2" fill="var(--pixel-error, #ff6b6b)"/>
      <rect x="10" y="10" width="2" height="2" fill="var(--pixel-error, #ff6b6b)"/>
      <rect x="12" y="12" width="2" height="2" fill="var(--pixel-error, #ff6b6b)"/>
    </svg>
  ),

  // Info
  info: (
    <svg viewBox="0 0 16 16" fill="currentColor">
      <rect x="4" y="1" width="8" height="2"/>
      <rect x="2" y="3" width="2" height="2"/>
      <rect x="12" y="3" width="2" height="2"/>
      <rect x="1" y="5" width="2" height="6"/>
      <rect x="13" y="5" width="2" height="6"/>
      <rect x="2" y="11" width="2" height="2"/>
      <rect x="12" y="11" width="2" height="2"/>
      <rect x="4" y="13" width="8" height="2"/>
      <rect x="7" y="4" width="2" height="2"/>
      <rect x="7" y="7" width="2" height="5"/>
    </svg>
  ),

  // Eye
  eye: (
    <svg viewBox="0 0 16 16" fill="currentColor">
      <rect x="4" y="4" width="8" height="2"/>
      <rect x="2" y="6" width="2" height="4"/>
      <rect x="12" y="6" width="2" height="4"/>
      <rect x="4" y="10" width="8" height="2"/>
      <rect x="4" y="6" width="8" height="4" fill="var(--pixel-bg, #fff)"/>
      <rect x="6" y="7" width="4" height="2" fill="var(--pixel-iris, #48dbfb)"/>
      <rect x="7" y="7" width="2" height="2" fill="var(--pixel-pupil, #000)"/>
    </svg>
  ),

  // Copy
  copy: (
    <svg viewBox="0 0 16 16" fill="currentColor">
      <rect x="4" y="1" width="10" height="2"/>
      <rect x="4" y="1" width="2" height="11"/>
      <rect x="12" y="1" width="2" height="11"/>
      <rect x="4" y="10" width="10" height="2"/>
      <rect x="1" y="4" width="10" height="2"/>
      <rect x="1" y="4" width="2" height="11"/>
      <rect x="9" y="4" width="2" height="11"/>
      <rect x="1" y="13" width="10" height="2"/>
    </svg>
  ),

  // Link
  link: (
    <svg viewBox="0 0 16 16" fill="currentColor">
      <rect x="7" y="1" width="5" height="2"/>
      <rect x="11" y="3" width="2" height="4"/>
      <rect x="9" y="5" width="2" height="2"/>
      <rect x="7" y="7" width="2" height="2"/>
      <rect x="5" y="9" width="2" height="2"/>
      <rect x="3" y="9" width="2" height="4"/>
      <rect x="4" y="13" width="5" height="2"/>
      <rect x="3" y="11" width="2" height="2"/>
      <rect x="11" y="3" width="2" height="2"/>
    </svg>
  ),

  // Lock
  lock: (
    <svg viewBox="0 0 16 16" fill="currentColor">
      <rect x="5" y="1" width="6" height="2"/>
      <rect x="4" y="3" width="2" height="4"/>
      <rect x="10" y="3" width="2" height="4"/>
      <rect x="2" y="7" width="12" height="2"/>
      <rect x="2" y="7" width="2" height="8"/>
      <rect x="12" y="7" width="2" height="8"/>
      <rect x="2" y="13" width="12" height="2"/>
      <rect x="7" y="10" width="2" height="2"/>
    </svg>
  ),

  // Target
  target: (
    <svg viewBox="0 0 16 16" fill="currentColor">
      <rect x="4" y="1" width="8" height="2"/>
      <rect x="2" y="3" width="2" height="2"/>
      <rect x="12" y="3" width="2" height="2"/>
      <rect x="1" y="5" width="2" height="6"/>
      <rect x="13" y="5" width="2" height="6"/>
      <rect x="2" y="11" width="2" height="2"/>
      <rect x="12" y="11" width="2" height="2"/>
      <rect x="4" y="13" width="8" height="2"/>
      <rect x="6" y="4" width="4" height="2"/>
      <rect x="4" y="6" width="2" height="4"/>
      <rect x="10" y="6" width="2" height="4"/>
      <rect x="6" y="10" width="4" height="2"/>
      <rect x="7" y="7" width="2" height="2" fill="var(--pixel-center, #ff6b6b)"/>
    </svg>
  ),

  // Medal
  medal: (
    <svg viewBox="0 0 16 16" fill="currentColor">
      <rect x="6" y="1" width="4" height="2"/>
      <rect x="5" y="1" width="2" height="5"/>
      <rect x="9" y="1" width="2" height="5"/>
      <rect x="4" y="5" width="8" height="2"/>
      <rect x="3" y="7" width="2" height="2"/>
      <rect x="11" y="7" width="2" height="2"/>
      <rect x="2" y="9" width="2" height="2"/>
      <rect x="12" y="9" width="2" height="2"/>
      <rect x="3" y="11" width="2" height="2"/>
      <rect x="11" y="11" width="2" height="2"/>
      <rect x="4" y="13" width="8" height="2"/>
      <rect x="6" y="8" width="4" height="4" fill="var(--pixel-gem, #feca57)"/>
    </svg>
  ),

  // Award/Badge
  award: (
    <svg viewBox="0 0 16 16" fill="currentColor">
      <rect x="4" y="1" width="8" height="2"/>
      <rect x="3" y="3" width="2" height="2"/>
      <rect x="11" y="3" width="2" height="2"/>
      <rect x="2" y="5" width="2" height="3"/>
      <rect x="12" y="5" width="2" height="3"/>
      <rect x="3" y="8" width="2" height="2"/>
      <rect x="11" y="8" width="2" height="2"/>
      <rect x="4" y="10" width="8" height="2"/>
      <rect x="5" y="12" width="2" height="3"/>
      <rect x="9" y="12" width="2" height="3"/>
      <rect x="7" y="4" width="2" height="2" fill="var(--pixel-star, #feca57)"/>
    </svg>
  ),

  // Zap/Lightning
  zap: (
    <svg viewBox="0 0 16 16" fill="currentColor">
      <rect x="8" y="1" width="4" height="2"/>
      <rect x="6" y="3" width="4" height="2"/>
      <rect x="4" y="5" width="6" height="2"/>
      <rect x="6" y="7" width="6" height="2"/>
      <rect x="7" y="9" width="4" height="2"/>
      <rect x="5" y="11" width="4" height="2"/>
      <rect x="4" y="13" width="4" height="2"/>
    </svg>
  ),

  // Clock
  clock: (
    <svg viewBox="0 0 16 16" fill="currentColor">
      <rect x="4" y="1" width="8" height="2"/>
      <rect x="2" y="3" width="2" height="2"/>
      <rect x="12" y="3" width="2" height="2"/>
      <rect x="1" y="5" width="2" height="6"/>
      <rect x="13" y="5" width="2" height="6"/>
      <rect x="2" y="11" width="2" height="2"/>
      <rect x="12" y="11" width="2" height="2"/>
      <rect x="4" y="13" width="8" height="2"/>
      <rect x="7" y="4" width="2" height="4"/>
      <rect x="9" y="7" width="3" height="2"/>
    </svg>
  ),
} as const;

// Main component
function PixelIcon({ name, size = 24, className = '', color }: PixelIconProps) {
  const icon = PIXEL_ICONS[name];
  
  if (!icon) {
    console.warn(`PixelIcon: Unknown icon "${name}"`);
    return null;
  }

  return (
    <span 
      className={`inline-flex items-center justify-center ${className}`}
      style={{ 
        width: size, 
        height: size, 
        color: color || 'currentColor',
        imageRendering: 'pixelated',
      }}
    >
      {icon}
    </span>
  );
}

export default memo(PixelIcon);
export { PIXEL_ICONS };
export type PixelIconName = keyof typeof PIXEL_ICONS;
