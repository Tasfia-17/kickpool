"use client";

import Link from 'next/link';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
  onClick?: () => void;
}

const sizeClasses = {
  sm: { emoji: 'text-xl', text: 'text-lg' },
  md: { emoji: 'text-2xl', text: 'text-xl' },
  lg: { emoji: 'text-3xl', text: 'text-2xl' },
  xl: { emoji: 'text-4xl', text: 'text-3xl' },
};

export default function Logo({ size = 'md', className = '', onClick }: LogoProps) {
  const sc = sizeClasses[size];

  const content = (
    <div
      className={`cursor-pointer transition-transform duration-300 ease-out hover:scale-105 flex items-center gap-1.5 ${className}`}
      onClick={onClick}
    >
      <span className={sc.emoji} aria-hidden="true">⚽</span>
      <span className={`font-black text-white ${sc.text} tracking-tight leading-none`}>
        KickPool
      </span>
    </div>
  );

  if (onClick) return content;

  return (
    <Link href="/" className="focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 rounded">
      {content}
    </Link>
  );
}
