import {describe, expect, it} from 'vitest';
import {NfcRegisterPacket} from '../../ble/packets/NfcRegisterPacket';
import {NfcScanStartPacket} from '../../ble/packets/NfcScanStartPacket';
import {NfcUnregisterPacket} from '../../ble/packets/NfcUnregisterPacket';
import {BLEOpcode} from '../../utils/bleConstants';

describe('NFC Packets (Full Suite)', () => {
  const configKey = 'ABCDEFGH';
  const uidBytes = [0XAA, 0XBB, 0XCC, 0XDD];

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
    const packet = new NfcRegisterPacket(configKey, new Uint8Array(uidBytes));
    const fullPacket = packet.toPacket();

    // Payload: Key(8) + UID_LEN(1) + UID(4) = 13 bytes
    // Total: 1+1+13+1 = 16 bytes

    expect(fullPacket[0]).toBe(BLEOpcode.REGISTER_NFC_TAG);
    expect(fullPacket[1]).toBe(13);
    expect(String.fromCharCode(...fullPacket.slice(2, 10))).toBe(configKey);
    expect(fullPacket[10]).toBe(uidBytes.length); // UID Length
    expect(fullPacket.slice(11, 15)).toEqual(new Uint8Array(uidBytes));
    expect(fullPacket.length).toBe(16);
  });

  it('should construct NfcUnregister (0x19) full packet', () => {
    const packet = new NfcUnregisterPacket(configKey, new Uint8Array(uidBytes));
    const fullPacket = packet.toPacket();

    // Payload: Key(8) + UID_LEN(1) + UID(4) = 13 bytes
    // Total: 1+1+13+1 = 16 bytes

    expect(fullPacket[0]).toBe(BLEOpcode.UNREGISTER_NFC_TAG);
    expect(fullPacket[1]).toBe(13);
    expect(String.fromCharCode(...fullPacket.slice(2, 10))).toBe(configKey);
    expect(fullPacket[10]).toBe(uidBytes.length); // UID Length
    expect(fullPacket.slice(11, 15)).toEqual(new Uint8Array(uidBytes));
    expect(fullPacket.length).toBe(16);
  });
});
