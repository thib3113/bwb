import { describe, expect, it } from 'vitest';
import { NfcOpeningLogPayload } from '../logs/NfcOpeningLogPayload';
import { BLEOpcode } from '../../bleConstants';

describe('NfcOpeningLogPayload', () => {
  it('should parse correctly', () => {
    const opcode = BLEOpcode.LOG_EVENT_NFC_OPENING;
    const payload = new Uint8Array([0x00, 0x00, 0x05, 0x03, 0x04, 0xAA, 0xBB, 0xCC, 0xDD]);
    const instance = new NfcOpeningLogPayload(opcode, payload, new Uint8Array());
    expect(instance.tag_uid).toBe('AA:BB:CC:DD');
    expect(instance.tag_type).toBe(3);
  });
});
