import { describe, expect, it } from 'vitest';
import { NfcOpeningLogPayload } from '../logs/NfcOpeningLogPayload';
import { BLEOpcode } from '../../bleConstants';

describe('NfcOpeningLogPayload', () => {
  it('should parse UID correctly with variable length', () => {
    const opcode = BLEOpcode.LOG_EVENT_NFC_OPENING;
    // Age(3) + Type(1) + UID_Len(1) + UID(4) = 9 bytes
    const payload = new Uint8Array([
      0x00,
      0x00,
      0x0a, // Age: 10s
      0x03, // Type: USER_BADGE
      0x04, // UID_Len: 4
      0xaa,
      0xbb,
      0xcc,
      0xdd // UID
    ]);

    const instance = new NfcOpeningLogPayload(opcode, payload, new Uint8Array());
    expect(instance.tagType).toBe(0x03);
    expect(instance.tagUid).toBe('AA:BB:CC:DD');
    expect(instance.age).toBe(10);
  });

  it('should handle longer UID (7 bytes)', () => {
    const opcode = BLEOpcode.LOG_EVENT_NFC_OPENING;
    const payload = new Uint8Array([
      0x00, 0x00, 0x00, 0x01, 0x07, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07
    ]);

    const instance = new NfcOpeningLogPayload(opcode, payload, new Uint8Array());
    expect(instance.tagUid).toBe('01:02:03:04:05:06:07');
  });

  it('should handle invalid length', () => {
    const opcode = BLEOpcode.LOG_EVENT_NFC_OPENING;
    const payload = new Uint8Array([0x00, 0x00, 0x00, 0x01, 0x04, 0xaa, 0xbb]); // Missing 2 bytes
    const instance = new NfcOpeningLogPayload(opcode, payload, new Uint8Array());
    expect(instance.tagUid).toBe('INVALID_UID');
  });
});
