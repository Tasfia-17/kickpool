/**
 * Multi-Pass NTP Clock Synchronization Engine
 *
 * Implements a 10-iteration NTP handshake with IQR-based outlier rejection
 * and median offset calculation. Achieves sub-50ms accuracy versus the
 * ~100-300ms variance of a single ping/pong.
 *
 * Framework-agnostic — no React dependency. Uses Socket.IO for transport.
 *
 * NTP Model:
 *   T1 = client send time
 *   T2 = server receive time
 *   T3 = server send time
 *   T4 = client receive time
 *
 *   RTT    = (T4 - T1) - (T3 - T2)
 *   Offset = ((T2 - T1) + (T3 - T4)) / 2
 */

import type { Socket } from 'socket.io-client';

// --- Configuration ---

const BURST_COUNT = 10;
const BURST_INTERVAL_MS = 100;
const PERIODIC_INTERVAL_MS = 30_000;
const MIN_SAMPLES_FOR_SYNC = 5;
const HANDSHAKE_TIMEOUT_MS = 3_000;

// --- Types ---

interface TimeSample {
  offset: number;
  rtt: number;
  timestamp: number; // when this sample was taken (local time)
}

type SyncCallback = (offset: number, confidence: number) => void;

interface ClockSyncEngine {
  start(socket: Socket): void;
  stop(): void;
  resync(): void;
  getOffset(): number;
  getConfidence(): number;
  getNow(): number;
  onSyncComplete(cb: SyncCallback): void;
}

// --- Math Helpers ---

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function quartiles(arr: number[]): { q1: number; q3: number } {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const lower = sorted.slice(0, mid);
  const upper = sorted.length % 2 !== 0 ? sorted.slice(mid + 1) : sorted.slice(mid);
  return { q1: median(lower), q3: median(upper) };
}

/**
 * Filter outliers using the Interquartile Range (IQR) method.
 * Samples with offsets outside Q1 - 1.5*IQR .. Q3 + 1.5*IQR are discarded.
 */
function filterOutliers(samples: TimeSample[]): TimeSample[] {
  if (samples.length < 4) return samples; // Too few to filter

  const offsets = samples.map(s => s.offset);
  const { q1, q3 } = quartiles(offsets);
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  return samples.filter(s => s.offset >= lowerBound && s.offset <= upperBound);
}

/**
 * Calculate confidence score (0-1) based on how consistent RTT values are.
 * Low RTT variance = high confidence. If all RTTs are identical, confidence = 1.
 */
function calculateConfidence(samples: TimeSample[]): number {
  if (samples.length < 2) return 0;

  const rtts = samples.map(s => s.rtt);
  const mean = rtts.reduce((a, b) => a + b, 0) / rtts.length;
  const variance = rtts.reduce((sum, v) => sum + (v - mean) ** 2, 0) / rtts.length;
  const stdDev = Math.sqrt(variance);

  // Map stdDev to confidence: 0ms stdDev = 1.0, 100ms+ stdDev = ~0.1
  // Using exponential decay: confidence = e^(-stdDev / 40)
  const confidence = Math.exp(-stdDev / 40);
  return Math.max(0, Math.min(1, confidence));
}

// --- Engine Factory ---

export function createClockSyncEngine(): ClockSyncEngine {
  let socket: Socket | null = null;
  let currentOffset = 0;
  let currentConfidence = 0;
  let samples: TimeSample[] = [];
  let callbacks: SyncCallback[] = [];
  let periodicTimer: ReturnType<typeof setInterval> | null = null;
  let burstTimer: ReturnType<typeof setTimeout> | null = null;
  let burstIndex = 0;
  let isBursting = false;
  let stopped = false;

  // Visibility change handler reference for cleanup
  let visibilityHandler: (() => void) | null = null;

  function notifyCallbacks() {
    for (const cb of callbacks) {
      try {
        cb(currentOffset, currentConfidence);
      } catch {
        // Don't let a bad callback crash the engine
      }
    }
  }

  function processSamples() {
    if (samples.length < MIN_SAMPLES_FOR_SYNC) {
      // Not enough data — keep current offset and report low confidence
      currentConfidence = samples.length / MIN_SAMPLES_FOR_SYNC * 0.5;
      notifyCallbacks();
      return;
    }

    const filtered = filterOutliers(samples);

    if (filtered.length < 2) {
      // IQR filtered too aggressively — fall back to all samples
      currentOffset = median(samples.map(s => s.offset));
      currentConfidence = 0.3;
    } else {
      currentOffset = median(filtered.map(s => s.offset));
      currentConfidence = calculateConfidence(filtered);
    }

    notifyCallbacks();
  }

  function sendPing() {
    if (!socket || !socket.connected || stopped) return;

    const t1 = Date.now();
    socket.emit('room:time_sync', { t1 });

    // Timeout guard — if no reply arrives, abandon this sample
    const timeoutId = setTimeout(() => {
      socket?.off('room:time_sync_reply', handler);
    }, HANDSHAKE_TIMEOUT_MS);

    const handler = (reply: { t1: number; t2: number; t3: number }) => {
      clearTimeout(timeoutId);

      // Only accept the reply that matches our t1
      if (reply.t1 !== t1) return;

      const t4 = Date.now();
      const rtt = (t4 - t1) - (reply.t3 - reply.t2);
      const offset = ((reply.t2 - t1) + (reply.t3 - t4)) / 2;

      // Sanity check: reject impossible RTT values
      if (rtt < 0 || rtt > 5000) return;

      samples.push({ offset, rtt, timestamp: t4 });

      // Keep only the last 20 samples for rolling accuracy
      if (samples.length > 20) {
        samples = samples.slice(-20);
      }
    };

    socket.once('room:time_sync_reply', handler);
  }

  function runBurst() {
    if (stopped || !socket?.connected) return;

    isBursting = true;
    burstIndex = 0;
    // Clear old burst samples for a fresh calculation
    samples = [];

    const tick = () => {
      if (stopped || burstIndex >= BURST_COUNT) {
        isBursting = false;
        // Process after the last sample has a moment to arrive
        setTimeout(() => processSamples(), 200);
        return;
      }

      sendPing();
      burstIndex++;
      burstTimer = setTimeout(tick, BURST_INTERVAL_MS);
    };

    tick();
  }

  function startPeriodicSync() {
    stopPeriodicSync();
    periodicTimer = setInterval(() => {
      if (!isBursting && socket?.connected) {
        sendPing();
        // Process after reply arrives
        setTimeout(() => processSamples(), 500);
      }
    }, PERIODIC_INTERVAL_MS);
  }

  function stopPeriodicSync() {
    if (periodicTimer) {
      clearInterval(periodicTimer);
      periodicTimer = null;
    }
  }

  function handleVisibilityChange() {
    if (document.visibilityState === 'visible' && socket?.connected && !stopped) {
      // Tab came back — run a fresh burst to recalibrate
      runBurst();
    }
  }

  // --- Public API ---

  const engine: ClockSyncEngine = {
    start(sock: Socket) {
      socket = sock;
      stopped = false;

      // Run initial burst
      if (sock.connected) {
        runBurst();
      }

      // Handle reconnection
      const onConnect = () => {
        if (!stopped) runBurst();
      };
      sock.on('connect', onConnect);

      // Start periodic single-sample syncs
      startPeriodicSync();

      // Listen for tab visibility changes
      if (typeof document !== 'undefined') {
        visibilityHandler = handleVisibilityChange;
        document.addEventListener('visibilitychange', visibilityHandler);
      }

      // Store cleanup reference
      const originalStop = engine.stop;
      engine.stop = () => {
        sock.off('connect', onConnect);
        originalStop();
      };
    },

    stop() {
      stopped = true;
      stopPeriodicSync();

      if (burstTimer) {
        clearTimeout(burstTimer);
        burstTimer = null;
      }

      if (visibilityHandler && typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', visibilityHandler);
        visibilityHandler = null;
      }

      socket = null;
    },

    resync() {
      if (!stopped && socket?.connected) {
        runBurst();
      }
    },

    getOffset() {
      return currentOffset;
    },

    getConfidence() {
      return currentConfidence;
    },

    getNow() {
      return Date.now() + currentOffset;
    },

    onSyncComplete(cb: SyncCallback) {
      callbacks.push(cb);
    },
  };

  return engine;
}
