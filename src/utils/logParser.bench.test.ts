import { describe, it, expect } from 'vitest';
import { parseLogs } from './logParser';
import { BoksLog } from '../types';
import { BLEOpcode } from './bleConstants';

describe('logParser Performance', () => {
  it('should parse 300 logs quickly', () => {
    // Generate 300 mock logs
    const logs: BoksLog[] = Array.from({ length: 300 }, (_, i) => ({
      id: String(i),
      device_id: 'test-device',
      deviceId: 'test-device',
      timestamp: new Date().toISOString(),
      opcode: BLEOpcode.VALID_OPEN_CODE,
      payload: new Uint8Array([0x01, 0x02]),
      synced: true,
      event: 'test_event',
      type: 'info',
    }));

    const start = performance.now();
    const parsed = parseLogs(logs);
    const end = performance.now();
    const duration = end - start;

    console.log(`Parsing 300 logs took ${duration.toFixed(3)}ms`);

    expect(parsed).toHaveLength(300);
    // It should be very fast, well under 16ms (one frame)
    expect(duration).toBeLessThan(10);
  });
});
