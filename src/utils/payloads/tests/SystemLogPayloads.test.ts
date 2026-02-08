import { describe, expect, it } from 'vitest';
import { PowerOffLogPayload } from '../logs/PowerOffLogPayload';
import { ErrorLogPayload } from '../logs/ErrorLogPayload';
import { BLEOpcode } from '../../bleConstants';

describe('System Log Payloads', () => {
  it('should parse PowerOff reason correctly', () => {
    const opcode = BLEOpcode.POWER_OFF;
    const payload = new Uint8Array([0x00, 0x00, 0x00, 0x03]); // Age: 0, Reason: soft_reset (3)
    const instance = new PowerOffLogPayload(opcode, payload, new Uint8Array());
    expect(instance.reason).toBe('soft_reset');
  });

  it('should parse Error log correctly', () => {
    const opcode = BLEOpcode.LOG_EVENT_ERROR;
    const payload = new Uint8Array([0x00, 0x00, 0x00, 0xbc]); // Age: 0, Error: mfrc630_error_bc (0xBC)
    const instance = new ErrorLogPayload(opcode, payload, new Uint8Array());
    expect(instance.errorCode).toBe('mfrc630_error_bc');
  });
});
