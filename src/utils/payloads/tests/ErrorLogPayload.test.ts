import { describe, expect, it } from 'vitest';
import { ErrorLogPayload } from '../logs/ErrorLogPayload';
import { BLEOpcode } from '../../bleConstants';

describe('ErrorLogPayload', () => {
  it('should parse correctly', () => {
    const opcode = BLEOpcode.LOG_EVENT_ERROR;
    const payload = new Uint8Array([0x00, 0x00, 0x01, 0x01, 0x02, 0x03]);
    const instance = new ErrorLogPayload(opcode, payload, new Uint8Array());
    expect(instance.error_code).toBe(2);
  });
});
