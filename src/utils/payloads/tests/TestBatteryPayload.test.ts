import { describe, expect, it } from 'vitest';
import { TestBatteryPayload } from '../TestBatteryPayload';
import { BLEOpcode } from '../../bleConstants';

describe('TestBatteryPayload', () => {
  it('should parse correctly', () => {
    const payload = new Uint8Array([80]);
    const instance = new TestBatteryPayload(BLEOpcode.TEST_BATTERY, payload, new Uint8Array());
    expect(instance.level_last).toBe(80);
  });
});
