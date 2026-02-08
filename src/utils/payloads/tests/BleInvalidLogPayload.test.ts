import { describe, expect, it } from 'vitest';
import { BleInvalidLogPayload } from '../logs/BleInvalidLogPayload';
import { BLEOpcode } from '../../bleConstants';

describe('BleInvalidLogPayload', () => {
  it('should parse correctly', () => {
    const opcode = BLEOpcode.LOG_CODE_BLE_INVALID;
    // Age(3) + Code(6) + MAC(6) = 15 bytes
    const payload = new Uint8Array([
      0x00, 0x00, 0x0a, // Age: 10s
      0x31, 0x32, 0x33, 0x34, 0x35, 0x36, // Code: "123456"
      0x11, 0x22, 0x33, 0x44, 0x55, 0x66, // MAC: 11:22:33:44:55:66
    ]);
    const instance = new BleInvalidLogPayload(opcode, payload, new Uint8Array());
    expect(instance.code).toBe('123456');
    expect(instance.macAddress).toBe('11:22:33:44:55:66');
  });
});
