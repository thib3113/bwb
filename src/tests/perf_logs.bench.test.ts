import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '../db/db';
import { BoksLog } from '../types';

describe('Log Fetching Performance', () => {
  const DEVICE_A = 'device-a-uuid';
  const DEVICE_B = 'device-b-uuid';
  const LOG_COUNT = 2000;

  beforeEach(async () => {
    await db.logs.clear();
    const logs: BoksLog[] = [];

    const now = Date.now();

    // Generate logs
    for (let i = 0; i < LOG_COUNT; i++) {
      // Device A logs (Target)
      logs.push({
        id: `log-a-${i}`,
        device_id: DEVICE_A,
        // Decreasing timestamp: 0 is newest
        timestamp: new Date(now - i * 1000).toISOString(),
        event: 'TEST_EVENT',
        type: 'info',
        synced: false
      });
      // Device B logs (Noise)
      logs.push({
        id: `log-b-${i}`,
        device_id: DEVICE_B,
        timestamp: new Date(now - i * 1000 - 500).toISOString(),
        event: 'TEST_EVENT',
        type: 'info',
        synced: false
      });
    }
    // Bulk add
    await db.logs.bulkAdd(logs);
  }, 30000); // Increase timeout for setup

  afterEach(async () => {
    await db.logs.clear();
  });

  it('benchmarks original vs optimized query', async () => {
    // --- Original Approach ---
    const startOriginal = performance.now();
    const originalResult = await db.logs
      .where('device_id')
      .equals(DEVICE_A)
      .toArray()
      .then((logs) => logs.sort((a, b) => Number(b.timestamp) - Number(a.timestamp)));
    const endOriginal = performance.now();
    const timeOriginal = endOriginal - startOriginal;

    // --- Optimized Approach ---
    const startOptimized = performance.now();
    const optimizedResult = await db.logs
      .orderBy('timestamp')
      .reverse()
      .filter((log) => log.device_id === DEVICE_A)
      .limit(50)
      .toArray();
    const endOptimized = performance.now();
    const timeOptimized = endOptimized - startOptimized;

    console.log(`Original Time (${originalResult.length} logs): ${timeOriginal.toFixed(2)}ms`);
    console.log(`Optimized Time (${optimizedResult.length} logs): ${timeOptimized.toFixed(2)}ms`);

    // Verification
    expect(optimizedResult.length).toBe(50);

    // Verify sort order of optimized result
    for (let i = 0; i < optimizedResult.length - 1; i++) {
      const current = new Date(optimizedResult[i].timestamp).getTime();
      const next = new Date(optimizedResult[i+1].timestamp).getTime();
      expect(current).toBeGreaterThanOrEqual(next);
    }

    // Check if original approach actually sorts correctly with ISO strings
    // Number("2023-...") is NaN. NaN - NaN is NaN. sort returns 0 (no change).
    // So originalResult is likely in insertion order or undefined order.
    const originalFirstTimestamp = new Date(originalResult[0].timestamp).getTime();
    const originalLastTimestamp = new Date(originalResult[originalResult.length - 1].timestamp).getTime();

    console.log(`Original First: ${originalResult[0].timestamp}`);
    console.log(`Original Last: ${originalResult[originalResult.length - 1].timestamp}`);

    // The optimization is also a correctness fix if timestamps are strings!
  }, 30000); // Increased timeout for the test itself
});
