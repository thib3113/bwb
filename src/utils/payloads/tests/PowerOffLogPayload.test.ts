import { describe, expect, it } from 'vitest';
import { PowerOffLogPayload } from '../logs/PowerOffLogPayload';
import { BLEOpcode } from '../../bleConstants';

describe('PowerOffLogPayload', () => {
  it('should parse correctly', () => {
    const opcode = BLEOpcode.POWER_OFF;
    const payload = new Uint8Array([0x00, 0x00, 0x01, 0x05]); // Age 1, Reason 5
    const instance = new PowerOffLogPayload(opcode, payload, new Uint8Array());
    expect(instance.reason_code).toBe(5);
  });
});
