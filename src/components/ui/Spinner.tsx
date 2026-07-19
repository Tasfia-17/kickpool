'use client';

import { cn } from '@/lib/utils';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-3',
};

export function Spinner({ size = 'md', className, label }: SpinnerProps) {
  return (
    <div className="flex items-center justify-center gap-2" role="status" aria-label={label || 'Loading'}>
      <div
        className={cn(
          'border-pink-500 border-t-transparent rounded-full animate-spin',
          sizeClasses[size],
          className
        )}
      />
      {label && <span className="text-sm font-mono">{label}</span>}
      <span className="sr-only">{label || 'Loading...'}</span>
    </div>
  );
}

export default Spinner;
