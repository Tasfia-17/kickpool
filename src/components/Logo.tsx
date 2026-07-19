"use client";

import Link from 'next/link';
import Image from 'next/image';
import { usePokemonTheme } from '@/components/PokemonThemeProvider';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
  onClick?: () => void;
}

// CSS filter to shift the orange logo hue to match each theme color
const themeFilterMap: Record<string, string> = {
  pikachu: 'none',
  charizard: 'hue-rotate(-15deg) saturate(1.3)',
  umbreon: 'hue-rotate(200deg) saturate(0.6) brightness(0.7)',
  flareon: 'hue-rotate(-25deg) saturate(1.2)',
  squirtle: 'hue-rotate(185deg) saturate(1.1)',
  eevee: 'hue-rotate(0deg) saturate(0.15) brightness(1.1)',
  gengar: 'hue-rotate(230deg) saturate(1.2)',
  sylveon: 'hue-rotate(310deg) saturate(1.3)',
  bulbasaur: 'hue-rotate(130deg) saturate(1.1)',
};

// Explicit pixel dimensions for each size variant (width × height)
const sizeDimensions: Record<string, { width: number; height: number }> = {
  sm: { width: 85, height: 32 },
  md: { width: 106, height: 40 },
  lg: { width: 148, height: 56 },
  xl: { width: 212, height: 80 },
};

const sizeClasses = {
  sm: 'h-8',
  md: 'h-10',
  lg: 'h-14',
  xl: 'h-20',
};

export default function Logo({ size = 'md', className = '', onClick }: LogoProps) {
  const { currentTheme } = usePokemonTheme();
  const logoFilter = themeFilterMap[currentTheme.id] || 'none';
  const dims = sizeDimensions[size];

  const content = (
    <div
      className={`cursor-pointer transition-transform duration-300 ease-out hover:scale-105 ${className}`}
      onClick={onClick}
    >
      <Image
        src="/Logo_orange_tabby.jpg"
        alt="CinePurr"
        width={dims.width}
        height={dims.height}
        className={`${sizeClasses[size]} w-auto transition-[filter] duration-500`}
        style={{ filter: logoFilter }}
        priority
      />
    </div>
  );

  if (onClick) return content;

  return (
    <Link href="/" className="focus:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-2 rounded">
      {content}
    </Link>
  );
}
