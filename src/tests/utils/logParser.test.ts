import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseLog } from '../../utils/logParser';
import { BoksLog } from '../../types';
import { BLEOpcode } from '../../utils/bleConstants';

describe('logParser', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2023-01-01T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should overwrite timestamp with calculated age by default (current behavior)', () => {
    const originalTimestamp = '2020-01-01T00:00:00.000Z';
    const log: Partial<BoksLog> = {
      timestamp: originalTimestamp,
      opcode: BLEOpcode.LOG_DOOR_OPEN_HISTORY, // 0x81
      payload: new Uint8Array([0x00, 0x00, 0x00, 0x01]), // Age 0
      device_id: 'test-device',
      event: 'DOOR_OPENED',
      type: 'info'
    };

    const parsed = parseLog(log);

    // Current behavior: timestamp is calculated from Date.now() - age (0)
    // So it should be close to 2023-01-01T12:00:00.000Z (the mocked "now"), not originalTimestamp
    expect(parsed.timestamp).toBe('2023-01-01T12:00:00.000Z');
    expect(parsed.timestamp).not.toBe(originalTimestamp);
  });

  it('should preserve original timestamp when preserveTimestamp option is true', () => {
    const originalTimestamp = '2020-01-01T00:00:00.000Z';
    const log: Partial<BoksLog> = {
      timestamp: originalTimestamp,
      opcode: BLEOpcode.LOG_DOOR_OPEN_HISTORY, // 0x81
      payload: new Uint8Array([0x00, 0x00, 0x00, 0x01]), // Age 0
      device_id: 'test-device',
      event: 'DOOR_OPENED',
      type: 'info'
    };

    // This will fail (TS error) until we implement the option
    // But we write the test first to follow TDD/plan
    // We cast options as any to allow compilation for now
    const parsed = parseLog(log, { preserveTimestamp: true } as any);

    expect(parsed.timestamp).toBe(originalTimestamp);
  });
});
