'use client';

import { useEffect, useRef } from 'react';

/**
 * Accessibility: Skip to main content link
 * Allows keyboard users to skip navigation and go directly to main content
 */
export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-purple-600 focus:text-white focus:rounded-lg focus:font-bold focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-white"
    >
      Skip to main content
    </a>
  );
}

/**
 * Focus trap for modals and dialogs
 * Keeps focus within the component when open
 */
export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element when opened
    firstElement?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [isActive]);

  return containerRef;
}

/**
 * Announce messages to screen readers
 */
export function useAnnounce() {
  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const el = document.createElement('div');
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', priority);
    el.setAttribute('aria-atomic', 'true');
    el.className = 'sr-only';
    el.textContent = message;
    document.body.appendChild(el);
    
    setTimeout(() => el.remove(), 1000);
  };

  return announce;
}

/**
 * Reduced motion preference hook
 */
export function usePrefersReducedMotion() {
  const mediaQuery = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;
  
  return mediaQuery?.matches ?? false;
}

/**
 * Visually hidden text for screen readers
 */
export function VisuallyHidden({ children }: { children: React.ReactNode }) {
  return <span className="sr-only">{children}</span>;
}

/**
 * Live region for dynamic content updates
 */
export function LiveRegion({ 
  children, 
  priority = 'polite' 
}: { 
  children: React.ReactNode; 
  priority?: 'polite' | 'assertive';
}) {
  return (
    <div 
      role="status" 
      aria-live={priority} 
      aria-atomic="true"
      className="sr-only"
    >
      {children}
    </div>
  );
}
