import { describe, it, expect } from 'vitest';
import { BleValidLogPayload } from '../logs/BleValidLogPayload';
import { BLEOpcode } from '../../bleConstants';

describe('BleValidLogPayload', () => {
  it('should parse MAC correctly with padding and endianness', () => {
    const opcode = BLEOpcode.LOG_CODE_BLE_VALID_HISTORY;
    // Age(3) + Code(6) + Padding(2) + MAC(6) = 17 bytes
    const payload = new Uint8Array([
      0x00,
      0x00,
      0x0A, // Age: 10s
      ...new TextEncoder().encode('123456'), // Code: "123456"
      0x00,
      0x00, // Padding
      0x66,
      0x55,
      0x44,
      0x33,
      0x22,
      0x11, // MAC: 11:22:33:44:55:66 (Little Endian)
    ]);

    const instance = new BleValidLogPayload(opcode, payload, new Uint8Array());
    expect(instance.code).toBe('123456');
    expect(instance.macAddress).toBe('11:22:33:44:55:66');
    expect(instance.age).toBe(10);
  });
});
