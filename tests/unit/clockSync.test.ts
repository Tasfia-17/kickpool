import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createClockSyncEngine } from '@/lib/clockSync';

// --- Mock Socket ---

function createMockSocket() {
  const listeners = new Map<string, Set<(...args: any[]) => void>>();
  const onceListeners = new Map<string, Set<(...args: any[]) => void>>();

  const socket = {
    connected: true,

    emit: vi.fn((event: string, data?: any) => {}),

    on(event: string, handler: (...args: any[]) => void) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(handler);
      return socket;
    },

    once(event: string, handler: (...args: any[]) => void) {
      if (!onceListeners.has(event)) onceListeners.set(event, new Set());
      onceListeners.get(event)!.add(handler);
      return socket;
    },

    off(event: string, handler?: (...args: any[]) => void) {
      if (handler) {
        listeners.get(event)?.delete(handler);
        onceListeners.get(event)?.delete(handler);
      } else {
        listeners.delete(event);
        onceListeners.delete(event);
      }
      return socket;
    },

    // Test helper: simulate a server reply
    _triggerEvent(event: string, data: any) {
      // Fire `on` listeners
      listeners.get(event)?.forEach(h => h(data));
      // Fire `once` listeners (and remove them)
      const onces = onceListeners.get(event);
      if (onces) {
        const handlers = Array.from(onces);
        onces.clear();
        handlers.forEach(h => h(data));
      }
    },

    _getOnceCount(event: string) {
      return onceListeners.get(event)?.size ?? 0;
    },
  };

  return socket;
}

// --- Helper: Simulate NTP Handshake ---

/**
 * Simulates the server processing a room:time_sync request.
 * The mock socket will capture the emit call and generate a reply.
 *
 * @param socket Mock socket
 * @param serverOffset Simulated server clock offset from client (ms)
 * @param serverProcessingTime Simulated server processing delay (ms)
 * @param networkLatency Simulated one-way network latency (ms)
 */
function simulateNTPReplies(
  socket: ReturnType<typeof createMockSocket>,
  serverOffset: number = 50,
  serverProcessingTime: number = 1,
  networkLatency: number = 10,
) {
  socket.emit.mockImplementation((event: string, data?: any) => {
    if (event === 'room:time_sync' && data?.t1) {
      const t1 = data.t1;
      // Simulate network delay + server offset
      const t2 = t1 + networkLatency + serverOffset;
      const t3 = t2 + serverProcessingTime;

      // Simulate network delay for reply
      setTimeout(() => {
        socket._triggerEvent('room:time_sync_reply', { t1, t2, t3 });
      }, 1); // Minimal async delay for the test
    }
  });
}

// --- Tests ---

describe('ClockSyncEngine', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates an engine with default state', () => {
    const engine = createClockSyncEngine();
    expect(engine.getOffset()).toBe(0);
    expect(engine.getConfidence()).toBe(0);
    expect(typeof engine.getNow()).toBe('number');
  });

  it('getNow returns Date.now() + offset', () => {
    const engine = createClockSyncEngine();
    // Default offset is 0
    const now = Date.now();
    const engineNow = engine.getNow();
    expect(Math.abs(engineNow - now)).toBeLessThan(5);
  });

  it('calculates correct offset from 10 samples', async () => {
    const socket = createMockSocket();
    const engine = createClockSyncEngine();

    const syncPromise = new Promise<{ offset: number; confidence: number }>((resolve) => {
      engine.onSyncComplete((offset, confidence) => {
        resolve({ offset, confidence });
      });
    });

    // Known server offset of 50ms
    simulateNTPReplies(socket, 50, 1, 10);
    engine.start(socket as any);

    // Advance timers to allow the burst to complete (10 pings × 100ms + 200ms process delay)
    await vi.advanceTimersByTimeAsync(2000);

    const result = await syncPromise;

    // The calculated offset should be close to the simulated 50ms offset
    // Allow tolerance for rounding and timing artifacts
    expect(result.offset).toBeGreaterThan(30);
    expect(result.offset).toBeLessThan(70);
    expect(result.confidence).toBeGreaterThan(0);

    engine.stop();
  });

  it('rejects outlier samples via IQR', async () => {
    const socket = createMockSocket();
    const engine = createClockSyncEngine();
    let lastOffset = 0;
    let lastConfidence = 0;
    let callCount = 0;

    engine.onSyncComplete((offset, confidence) => {
      lastOffset = offset;
      lastConfidence = confidence;
      callCount++;
    });

    // Most replies have offset ~50ms, but inject 2 extreme outliers
    let pingCount = 0;
    socket.emit.mockImplementation((event: string, data?: any) => {
      if (event === 'room:time_sync' && data?.t1) {
        pingCount++;
        const t1 = data.t1;
        const isOutlier = pingCount === 3 || pingCount === 7;
        const serverOffset = isOutlier ? 5000 : 50; // 5000ms outlier vs 50ms normal

        const t2 = t1 + 10 + serverOffset;
        const t3 = t2 + 1;

        setTimeout(() => {
          socket._triggerEvent('room:time_sync_reply', { t1, t2, t3 });
        }, 1);
      }
    });

    engine.start(socket as any);
    await vi.advanceTimersByTimeAsync(2000);

    // With IQR filtering, the 5000ms outliers should be rejected
    // Offset should be close to 50ms, not pulled toward 5000ms
    expect(lastOffset).toBeLessThan(200);
    expect(callCount).toBeGreaterThan(0);

    engine.stop();
  });

  it('returns confidence based on sample spread', async () => {
    const socket = createMockSocket();

    // Test 1: Consistent RTTs → high confidence
    const engine1 = createClockSyncEngine();
    let confidence1 = 0;
    engine1.onSyncComplete((_, confidence) => { confidence1 = confidence; });

    simulateNTPReplies(socket, 50, 0, 5); // Very consistent
    engine1.start(socket as any);
    await vi.advanceTimersByTimeAsync(2000);
    engine1.stop();

    // Should have relatively high confidence
    expect(confidence1).toBeGreaterThan(0.3);
  });

  it('handles partial responses (< 10 replies) gracefully', async () => {
    const socket = createMockSocket();
    const engine = createClockSyncEngine();
    let syncCalled = false;

    engine.onSyncComplete(() => { syncCalled = true; });

    // Only reply to first 6 pings, then ignore
    let replyCount = 0;
    socket.emit.mockImplementation((event: string, data?: any) => {
      if (event === 'room:time_sync' && data?.t1) {
        replyCount++;
        if (replyCount <= 6) {
          const t1 = data.t1;
          const t2 = t1 + 60;
          const t3 = t2 + 1;
          setTimeout(() => {
            socket._triggerEvent('room:time_sync_reply', { t1, t2, t3 });
          }, 1);
        }
        // After 6, no reply — simulates packet loss
      }
    });

    engine.start(socket as any);
    await vi.advanceTimersByTimeAsync(2000);

    // Should still produce a result with 6 samples (>= MIN_SAMPLES_FOR_SYNC = 5)
    expect(syncCalled).toBe(true);
    expect(engine.getOffset()).not.toBe(0);

    engine.stop();
  });

  it('handles zero responses gracefully', async () => {
    const socket = createMockSocket();
    const engine = createClockSyncEngine();
    let syncCalled = false;

    engine.onSyncComplete(() => { syncCalled = true; });

    // Never reply to any ping
    socket.emit.mockImplementation(() => {});

    engine.start(socket as any);
    await vi.advanceTimersByTimeAsync(2000);

    // Should call back with low confidence, keeping offset at 0
    expect(syncCalled).toBe(true);
    expect(engine.getOffset()).toBe(0);
    expect(engine.getConfidence()).toBeLessThan(0.5);

    engine.stop();
  });

  it('resync triggers a new burst', async () => {
    const socket = createMockSocket();
    const engine = createClockSyncEngine();
    let syncCount = 0;

    engine.onSyncComplete(() => { syncCount++; });

    simulateNTPReplies(socket, 50, 1, 10);
    engine.start(socket as any);

    // Wait for initial burst
    await vi.advanceTimersByTimeAsync(2000);
    const afterInitial = syncCount;
    expect(afterInitial).toBeGreaterThan(0);

    // Trigger resync
    engine.resync();
    await vi.advanceTimersByTimeAsync(2000);

    // Should have received additional sync callbacks
    expect(syncCount).toBeGreaterThan(afterInitial);

    engine.stop();
  });

  it('stop() cleans up all timers and listeners', () => {
    const socket = createMockSocket();
    const engine = createClockSyncEngine();

    simulateNTPReplies(socket, 50);
    engine.start(socket as any);
    engine.stop();

    // After stop, emit count shouldn't increase
    const emitCountAfterStop = socket.emit.mock.calls.length;
    vi.advanceTimersByTime(35000); // Past periodic interval

    expect(socket.emit.mock.calls.length).toBe(emitCountAfterStop);
  });

  it('does not crash when socket disconnects during burst', async () => {
    const socket = createMockSocket();
    const engine = createClockSyncEngine();

    simulateNTPReplies(socket, 50, 1, 10);
    engine.start(socket as any);

    // Disconnect mid-burst
    await vi.advanceTimersByTimeAsync(300);
    socket.connected = false;

    // Should not throw
    await vi.advanceTimersByTimeAsync(2000);

    engine.stop();
  });
});
