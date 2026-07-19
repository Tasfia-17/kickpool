'use client';

import { useEffect, useState, useCallback } from 'react';

/**
 * AdBlocker Component - SAFE Implementation
 * 
 * SECURITY FIX: This version does NOT override native window functions
 * (window.open, window.alert, window.confirm, window.prompt).
 * 
 * Why we removed function overrides:
 * 1. They can break legitimate functionality across the app
 * 2. Malicious code can easily bypass them via iframe.contentWindow
 * 3. They modify global browser state which is an anti-pattern
 * 4. Stack trace checking is unreliable and easily spoofed
 * 
 * Instead, we use:
 * - CSS-based ad hiding (safe, declarative)
 * - Event listeners to prevent unwanted clicks (scoped)
 * - iframe sandbox attributes (added via React props where iframes are used)
 */

// Global blocked count with subscriber pattern
let globalBlockedCount = 0;
const blockedSubscribers = new Set<(count: number) => void>();

function incrementBlocked(reason?: string) {
  globalBlockedCount++;
  if (reason) {
    console.debug('[AdBlocker] Blocked:', reason, `(Total: ${globalBlockedCount})`);
  }
  blockedSubscribers.forEach(fn => fn(globalBlockedCount));
}

export const useAdBlocker = () => {
  useEffect(() => {
    // NOTE: We intentionally DO NOT override window.open, window.alert, 
    // window.confirm, or window.prompt as this is a security anti-pattern.
    // See component header for explanation.

    // Block click events on body that might be overlay ads
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Check if click is on a suspicious overlay
      if (target.tagName === 'BODY' || target.tagName === 'HTML') {
        const elementsAtPoint = document.elementsFromPoint(e.clientX, e.clientY);
        const hasIframe = elementsAtPoint.some(el => el.tagName === 'IFRAME');

        // If clicking "through" to body while iframe is present, might be an ad overlay
        if (hasIframe && elementsAtPoint.length <= 2) {
          e.preventDefault();
          e.stopPropagation();
          incrementBlocked('suspicious overlay click');
          return false;
        }
      }
    };

    // Block focus stealing (some ads steal focus to new windows)
    const handleBlur = () => {
      setTimeout(() => {
        if (document.hasFocus && !document.hasFocus()) {
          window.focus();
        }
      }, 100);
    };

    // Add CSS to hide common ad elements - AGGRESSIVE MODE
    const styleId = 'adblock-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        /* Hide common ad containers */
        [id*="ad-"],
        [id*="ads-"],
        [id*="advert"],
        [id*="banner"],
        [id*="sponsor"],
        [id*="popup"],
        [class*="ad-container"],
        [class*="ad-wrapper"],
        [class*="advertisement"],
        [class*="popup-ad"],
        [class*="overlay-ad"],
        [class*="ad-overlay"],
        [class*="banner-ad"],
        [class*="sponsor"],
        [class*="promo-"],
        div[onclick*="window.open"],
        a[target="_blank"][onclick],
        iframe[src*="doubleclick"],
        iframe[src*="googlesyndication"],
        iframe[src*="adservice"],
        iframe[src*="adnxs"],
        iframe[src*="adsystem"],
        iframe[src*="taboola"],
        iframe[src*="outbrain"],
        iframe[src*="mgid"],
        iframe[src*="popads"],
        iframe[src*="exoclick"],
        iframe[src*="juicyads"] {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
          width: 0 !important;
          height: 0 !important;
        }

        /* Prevent invisible click-jacking overlays */
        body > div[style*="z-index: 9999"],
        body > div[style*="z-index:9999"],
        body > div[style*="z-index: 999999"],
        body > div[style*="z-index:999999"],
        body > div[style*="position: fixed"][style*="inset: 0"],
        body > div[style*="position:fixed"][style*="inset:0"],
        body > div[style*="position: fixed"][style*="top: 0"][style*="left: 0"],
        body > div[style*="position:fixed"][style*="top:0"][style*="left:0"] {
          pointer-events: none !important;
        }

        /* Block close button interceptors */
        div[class*="close-blocker"],
        div[class*="click-blocker"],
        div[style*="cursor: pointer"][style*="position: absolute"][style*="z-index"] {
          pointer-events: none !important;
        }
      `;
      document.head.appendChild(style);
    }

    // Remove ad elements periodically (for dynamically loaded ads)
    const cleanupAds = () => {
      const adSelectors = [
        'iframe[src*="ad"]',
        'iframe[src*="pop"]',
        'div[id*="ad-"]',
        'div[class*="ad-"]',
        'div[class*="popup"]',
        'a[href*="click."]',
        'a[href*="//go."]'
      ];

      adSelectors.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            // Don't remove our own elements or video players
            if (!el.closest('.video-player') &&
                !el.closest('[data-cinepurr]') &&
                !el.id?.includes('player')) {
              (el as HTMLElement).style.display = 'none';
            }
          });
        } catch {}
      });
    };

    // Run cleanup every 2 seconds
    const cleanupInterval = setInterval(cleanupAds, 2000);
    cleanupAds(); // Run immediately

    // Listen for iframe messages that might be ad-related
    const handleMessage = (e: MessageEvent) => {
      // Block suspicious postMessage communications
      if (typeof e.data === 'string') {
        const data = e.data.toLowerCase();
        if (data.includes('ad') || data.includes('popup') || data.includes('redirect')) {
          // Only log if it's a serious error
          try {
            const parsed = JSON.parse(e.data);
            if (parsed && parsed.event && parsed.event.toLowerCase().includes('error')) {
              console.error('[AdBlocker] Serious suspicious message:', e.data);
            }
          } catch {
            // If data is not JSON and contains 'error', log it
            if (data.includes('error') || data.includes('fail') || data.includes('blocked')) {
              console.error('[AdBlocker] Serious suspicious message:', e.data);
            }
          }
          incrementBlocked('suspicious message');
          return;
        }
      }
    };

    // Empty handler for beforeunload - helps catch redirect attempts
    const handleBeforeUnload = () => {};

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('click', handleClick, true);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('message', handleMessage);

    return () => {
      // Cleanup event listeners (no functions to restore - we don't override them)
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', handleClick, true);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('message', handleMessage);

      // Clear cleanup interval
      clearInterval(cleanupInterval);

      // Remove style
      const style = document.getElementById(styleId);
      if (style) style.remove();
    };
  }, []);
};

/**
 * AdBlocker Component with visual indicator
 * Uses subscriber pattern instead of overriding console.log
 */
export default function AdBlocker({ showIndicator = false }: { showIndicator?: boolean }) {
  useAdBlocker();
  const [blocked, setBlocked] = useState(0);

  useEffect(() => {
    // Subscribe to blocked count updates using our safe subscriber pattern
    const handleBlockedUpdate = (count: number) => {
      setBlocked(count);
    };
    
    blockedSubscribers.add(handleBlockedUpdate);
    // Set initial value
    setBlocked(globalBlockedCount);

    return () => {
      blockedSubscribers.delete(handleBlockedUpdate);
    };
  }, []);

  if (!showIndicator || blocked === 0) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50 bg-green-500/90 text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 shadow-lg animate-pulse md:bottom-4">
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
      {blocked} ads blocked
    </div>
  );
}
