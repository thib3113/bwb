import { describe, expect, it } from 'vitest';
import { NfcRegisteringLogPayload } from '../logs/NfcRegisteringLogPayload';
import { BLEOpcode } from '../../bleConstants';

describe('NfcRegisteringLogPayload', () => {
  it('should parse correctly', () => {
    const opcode = BLEOpcode.LOG_EVENT_NFC_REGISTERING;
    const payload = new Uint8Array([0x00, 0x00, 0x05, 0x03, 0x04, 0xAA, 0xBB, 0xCC, 0xDD]);
    const instance = new NfcRegisteringLogPayload(opcode, payload, new Uint8Array());
    expect(instance.tag_uid).toBe('AA:BB:CC:DD');
  });
});
