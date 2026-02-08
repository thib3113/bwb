import { describe, expect, it } from 'vitest';
import { BleRebootLogPayload } from '../logs/BleRebootLogPayload';
import { BLEOpcode } from '../../bleConstants';

describe('BleRebootLogPayload', () => {
  it('should parse correctly', () => {
    const instance = new BleRebootLogPayload(BLEOpcode.BLE_REBOOT, new Uint8Array([0, 0, 0]), new Uint8Array());
    expect(instance).toBeDefined();
  });
});
