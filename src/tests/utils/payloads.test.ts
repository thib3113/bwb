import { describe, expect, it } from 'vitest';
import { BleValidLogPayload } from '../../utils/payloads/logs/BleValidLogPayload';
import { BoksOpcode } from '@thib3113/boks-sdk';
import { NotifyLogsCountPayload } from '../../utils/payloads/NotifyLogsCountPayload';

describe('Payloads', () => {
  describe('BleValidLogPayload', () => {
    it('should parse MAC correctly with padding and endianness', () => {
      const opcode = BoksOpcode.LOG_CODE_BLE_VALID;
      // Age(3) + Code(6) + Padding(2) + MAC(6) = 17 bytes
      const payload = new Uint8Array([
        0x00,
        0x00,
        0x0a, // Age: 10s
        ...new TextEncoder().encode('123456'), // Code: "123456"
        0x00,
        0x00, // Padding
        0x66,
        0x55,
        0x44,
        0x33,
        0x22,
        0x11 // MAC: 11:22:33:44:55:66 (Little Endian in logs)
      ]);

      const instance = new BleValidLogPayload(opcode, payload, new Uint8Array());
      expect(instance.code).toBe('123456');
      expect(instance.macAddress).toBe('11:22:33:44:55:66');
      expect(instance.age).toBe(10);
    });
  });

  describe('NotifyLogsCountPayload', () => {
    it('should parse count with Big Endian', () => {
      const opcode = BoksOpcode.NOTIFY_LOGS_COUNT;
      const payload = new Uint8Array([0x00, 0x17]); // 23
      const instance = new NotifyLogsCountPayload(opcode, payload, new Uint8Array());
      expect(instance.count).toBe(23);
    });
  });
});
