import { describe, expect, it } from 'vitest';
import { KeyInvalidLogPayload } from '../logs/KeyInvalidLogPayload';
import { BLEOpcode } from '../../bleConstants';

describe('KeyInvalidLogPayload', () => {
  it('should parse correctly', () => {
    const opcode = BLEOpcode.LOG_CODE_KEY_INVALID;
    const payload = new Uint8Array([0x00, 0x00, 0x0A, 0x31, 0x32, 0x33, 0x34, 0x35, 0x36]);
    const instance = new KeyInvalidLogPayload(opcode, payload, new Uint8Array());
    expect(instance.code).toBe('123456');
  });
});
