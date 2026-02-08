import { describe, expect, it } from 'vitest';
import { NfcRegisterPacket } from '../../ble/packets/NfcRegisterPacket';
import { NfcScanStartPacket } from '../../ble/packets/NfcScanStartPacket';
import { NfcUnregisterPacket } from '../../ble/packets/NfcUnregisterPacket';
import { BLEOpcode } from '../../utils/bleConstants';

describe('NFC Packets (Full Suite)', () => {
  const configKey = 'ABCDEFGH';
  const uidBytes = [0xaa, 0xbb, 0xcc, 0xdd];

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

  it('should generate exact hardcoded binary for NfcScanStartPacket', () => {
    // 0x17 (Op) + 0x08 (Len) + "12345678" + Checksum 0xC3
    const configKey = '12345678';
    const packet = new NfcScanStartPacket(configKey);
    const binary = packet.toPacket();

    const toHex = (buffer: Uint8Array) =>
      Array.from(buffer)
        .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
        .join(' ');

    const expectedHex = '17 08 31 32 33 34 35 36 37 38 C3';
    expect(toHex(binary)).toBe(expectedHex);
  });

  it('should generate exact hardcoded binary for NfcRegisterPacket', () => {
    // 0x18 (Op) + 0x0D (Len=13) + "ABCDEFGH" + 0x04 (LenUID) + "AABBCCDD" + Checksum
    const configKey = 'ABCDEFGH';
    const uidBytes = [0xaa, 0xbb, 0xcc, 0xdd];
    const packet = new NfcRegisterPacket(configKey, new Uint8Array(uidBytes));
    const binary = packet.toPacket();

    const toHex = (buffer: Uint8Array) =>
      Array.from(buffer)
        .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
        .join(' ');

    // Sum: 24 + 13 + 548 (Key) + 4 + 782 (UID) = 1371 -> 1371 % 256 = 91 -> 0x5B
    const expectedHex = '18 0D 41 42 43 44 45 46 47 48 04 AA BB CC DD 5B';
    expect(toHex(binary)).toBe(expectedHex);
  });

  it('should generate exact hardcoded binary for NfcUnregisterPacket', () => {
    // 0x19 (Op) + 0x0D (Len=13) + "ABCDEFGH" + 0x04 (LenUID) + "AABBCCDD" + Checksum
    const configKey = 'ABCDEFGH';
    const uidBytes = [0xaa, 0xbb, 0xcc, 0xdd];
    const packet = new NfcUnregisterPacket(configKey, new Uint8Array(uidBytes));
    const binary = packet.toPacket();

    const toHex = (buffer: Uint8Array) =>
      Array.from(buffer)
        .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
        .join(' ');

    // Sum: 25 + 13 + 548 + 4 + 782 = 1372 -> 1372 % 256 = 92 -> 0x5C
    const expectedHex = '19 0D 41 42 43 44 45 46 47 48 04 AA BB CC DD 5C';
    expect(toHex(binary)).toBe(expectedHex);
  });
});
