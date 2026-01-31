import { describe, it, expect } from 'vitest';
import { NfcScanStartPacket, NfcRegisterPacket, NfcUnregisterPacket } from '../../ble/packets/NfcPackets';
import { BLEOpcode } from '../../utils/bleConstants';

describe('NFC Packets (Full Suite)', () => {
  const configKey = "ABCDEFGH";
  const uidBytes = [0xAA, 0xBB, 0xCC, 0xDD];

  it('should construct NfcScanStart (0x17) full packet', () => {
    const packet = new NfcScanStartPacket(configKey);
    const fullPacket = packet.toPacket();
    
    // Payload: Key(8)
    // Total: 1+1+8+1 = 11 bytes
    
    expect(fullPacket[0]).toBe(BLEOpcode.REGISTER_NFC_TAG_SCAN_START);
    expect(fullPacket[1]).toBe(8);
    expect(String.fromCharCode(...fullPacket.slice(2, 10))).toBe(configKey);
    expect(fullPacket.length).toBe(11);
  });

  it('should construct NfcRegister (0x18) full packet', () => {
    const packet = new NfcRegisterPacket(configKey, uidBytes);
    const fullPacket = packet.toPacket();
    
    // Payload: Key(8) + UID(4) = 12 bytes
    // Total: 1+1+12+1 = 15 bytes
    
    expect(fullPacket[0]).toBe(BLEOpcode.REGISTER_NFC_TAG);
    expect(fullPacket[1]).toBe(12);
    expect(String.fromCharCode(...fullPacket.slice(2, 10))).toBe(configKey);
    expect(fullPacket.slice(10, 14)).toEqual(new Uint8Array(uidBytes));
    expect(fullPacket.length).toBe(15);
  });
  
  it('should construct NfcUnregister (0x19) full packet', () => {
    const packet = new NfcUnregisterPacket(configKey, uidBytes);
    const fullPacket = packet.toPacket();
    
    expect(fullPacket[0]).toBe(BLEOpcode.UNREGISTER_NFC_TAG);
    expect(fullPacket[1]).toBe(12);
    expect(String.fromCharCode(...fullPacket.slice(2, 10))).toBe(configKey);
    expect(fullPacket.slice(10, 14)).toEqual(new Uint8Array(uidBytes));
    expect(fullPacket.length).toBe(15);
  });
});