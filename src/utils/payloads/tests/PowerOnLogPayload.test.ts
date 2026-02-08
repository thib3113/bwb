import { describe, expect, it } from 'vitest';
import { PowerOnLogPayload } from '../logs/PowerOnLogPayload';
import { BLEOpcode } from '../../bleConstants';

describe('PowerOnLogPayload', () => {
  it('should parse correctly', () => {
    const instance = new PowerOnLogPayload(BLEOpcode.POWER_ON, new Uint8Array([0, 0, 0]), new Uint8Array());
    expect(instance).toBeDefined();
  });
});
