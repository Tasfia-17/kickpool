'use client';

import { useCallback, useRef, useState, useEffect } from 'react';

// Global audio context to be shared
let globalAudioContext: AudioContext | null = null;
let isAudioInitialized = false;
let hasUserInteracted = false;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  
  // Only create AudioContext after user interaction
  if (!hasUserInteracted) {
    return null;
  }
  
  if (!globalAudioContext) {
    try {
      globalAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {
      // Silently fail - AudioContext not supported
      return null;
    }
  }
  return globalAudioContext;
};

// Initialize audio on user interaction (only once)
if (typeof window !== 'undefined') {
  const initAudio = async () => {
    if (isAudioInitialized) return;
    
    hasUserInteracted = true;
    
    if (!globalAudioContext) {
      try {
        globalAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch {
        // AudioContext not supported
        return;
      }
    }
    
    if (globalAudioContext && globalAudioContext.state === 'suspended') {
      try {
        await globalAudioContext.resume();
        isAudioInitialized = true;
      } catch {
        // Could not resume audio context
      }
    } else if (globalAudioContext) {
      isAudioInitialized = true;
    }
  };
  
  // Initialize on first user interaction
  const initOnce = () => {
    // Initialize immediately (synchronously create context, async resume)
    hasUserInteracted = true;
    if (!globalAudioContext) {
      try {
        globalAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch {
        return;
      }
    }
    // Resume asynchronously
    initAudio();
    // Remove listeners after first interaction
    ['click', 'keydown', 'touchstart', 'mousedown'].forEach(event => {
      document.removeEventListener(event, initOnce);
    });
  };
  
  ['click', 'keydown', 'touchstart', 'mousedown'].forEach(event => {
    document.addEventListener(event, initOnce, { passive: true, once: true });
  });
}

export const useSounds = () => {
  const enabledRef = useRef<boolean>(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Check if already initialized
    if (isAudioInitialized) {
      setInitialized(true);
    }
    
    const checkInit = () => {
      if (isAudioInitialized && !initialized) {
        setInitialized(true);
      }
    };
    
    document.addEventListener('click', checkInit);
    return () => document.removeEventListener('click', checkInit);
  }, [initialized]);

  const playTone = useCallback(async (frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.1) => {
    if (!enabledRef.current) return;
    
    // If user hasn't interacted yet, mark as interacted and create context immediately
    if (!hasUserInteracted && typeof window !== 'undefined') {
      hasUserInteracted = true;
    }
    
    // Ensure AudioContext exists - create it if user has interacted but context doesn't exist
    if (typeof window !== 'undefined' && !globalAudioContext && hasUserInteracted) {
      try {
        globalAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch {
        return; // AudioContext not supported
      }
    }
    
    const audioContext = getAudioContext();
    if (!audioContext) {
      return; // Can't create AudioContext
    }
    
    // Resume if suspended (this is safe to call multiple times and will wait for it to complete)
    if (audioContext.state === 'suspended') {
      try {
        await audioContext.resume();
        // Wait a tiny bit to ensure context is fully ready
        await new Promise(resolve => setTimeout(resolve, 10));
      } catch {
        // Failed to resume, skip playing
        return;
      }
    }

    try {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = type;
      
      const now = audioContext.currentTime;
      gainNode.gain.setValueAtTime(volume, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
      
      oscillator.start(now);
      oscillator.stop(now + duration);
    } catch (error) {
      // Silently fail - audio might not be available
    }
  }, []);

  const playMessageSound = useCallback(() => {
    // Cute "pop" sound - two quick ascending tones
    playTone(600, 0.08, 'sine', 0.15);
    setTimeout(() => playTone(800, 0.1, 'sine', 0.1), 50);
  }, [playTone]);

  const playJoinSound = useCallback(() => {
    // Happy ascending chime
    playTone(523, 0.1, 'sine', 0.12); // C5
    setTimeout(() => playTone(659, 0.1, 'sine', 0.12), 80); // E5
    setTimeout(() => playTone(784, 0.15, 'sine', 0.1), 160); // G5
  }, [playTone]);

  const playLeaveSound = useCallback(() => {
    // Descending tone
    playTone(600, 0.1, 'sine', 0.1);
    setTimeout(() => playTone(400, 0.15, 'sine', 0.08), 100);
  }, [playTone]);

  const toggleSounds = useCallback((enabled: boolean) => {
    enabledRef.current = enabled;
  }, []);

  const isSoundEnabled = useCallback(() => enabledRef.current, []);

  return {
    playMessageSound,
    playJoinSound,
    playLeaveSound,
    toggleSounds,
    isSoundEnabled,
  };
};
