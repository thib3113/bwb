import { describe, expect, it } from 'vitest';
import {
  CreateMasterCodePacket,
  CreateMultiUseCodePacket,
  CreateSingleUseCodePacket,
  DeleteMasterCodePacket,
  DeleteMultiUseCodePacket,
  DeleteSingleUseCodePacket
} from '../../ble/packets/PinManagementPackets';
import { BLEOpcode } from '../../utils/bleConstants';

describe('Pin Management Packets (Full Suite)', () => {
  const configKey = 'ABCDEFGH';
  const code = '9999';
  const index = 2;

  it('should construct CreateMasterCode (0x11) full packet', () => {
    const packet = new CreateMasterCodePacket(configKey, index, code);
    const fullPacket = packet.toPacket();

    // Payload: Key(8) + Code(6) + Index(1) = 15 bytes
    // Code "9999" padded to 6 bytes: "9999" + 0x00 + 0x00
    // Total: 1(Op) + 1(Len) + 15(Payload) + 1(Checksum) = 18 bytes

    expect(fullPacket[0]).toBe(BLEOpcode.CREATE_MASTER_CODE);
    expect(fullPacket[1]).toBe(15);
    expect(String.fromCharCode(...fullPacket.slice(2, 10))).toBe(configKey);
    // Code starts at 10, length 6
    expect(String.fromCharCode(...fullPacket.slice(10, 14))).toBe(code);
    expect(fullPacket[14]).toBe(0); // Padding
    expect(fullPacket[15]).toBe(0); // Padding
    // Index at 16 (2 + 8 + 6)
    expect(fullPacket[16]).toBe(index);
    expect(fullPacket.length).toBe(18);
  });

  it('should construct CreateSingleUseCode (0x12) full packet', () => {
    const packet = new CreateSingleUseCodePacket(configKey, code);
    const fullPacket = packet.toPacket();

    // Payload: Key(8) + Code(6) = 14 bytes
    // Total: 1+1+14+1 = 17 bytes

    expect(fullPacket[0]).toBe(BLEOpcode.CREATE_SINGLE_USE_CODE);
    expect(fullPacket[1]).toBe(14);
    expect(String.fromCharCode(...fullPacket.slice(2, 10))).toBe(configKey);
    expect(String.fromCharCode(...fullPacket.slice(10, 14))).toBe(code);
    expect(fullPacket[14]).toBe(0); // Padding
    expect(fullPacket[15]).toBe(0); // Padding
    expect(fullPacket.length).toBe(17);
  });

  it('should construct DeleteMasterCode (0x0C) full packet', () => {
    const packet = new DeleteMasterCodePacket(configKey, index);
    const fullPacket = packet.toPacket();

    // Payload: Key(8) + Index(1) = 9 bytes
    // Total: 1+1+9+1 = 12 bytes

    expect(fullPacket[0]).toBe(BLEOpcode.DELETE_MASTER_CODE);
    expect(fullPacket[1]).toBe(9);
    expect(String.fromCharCode(...fullPacket.slice(2, 10))).toBe(configKey);
    expect(fullPacket[10]).toBe(index);
    expect(fullPacket.length).toBe(12);
  });

  it('should generate exact hardcoded binary for CreateMasterCodePacket', () => {
    // 0x11 (Op) + 0x0F (Len) + "AABBCCDD" + "1234\0\0" + 0x01 (Index) + Checksum 0xFF
    const configKey = 'AABBCCDD';
    const code = '1234';
    const index = 1;
    const packet = new CreateMasterCodePacket(configKey, index, code);
    const binary = packet.toPacket();

    const toHex = (buffer: Uint8Array) =>
      Array.from(buffer)
        .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
        .join(' ');

    const expectedHex = '11 0F 41 41 42 42 43 43 44 44 31 32 33 34 00 00 01 FF';
    expect(toHex(binary)).toBe(expectedHex);
  });

  it('should generate exact hardcoded binary for CreateSingleUseCodePacket', () => {
    // 0x12 (Op) + 0x0E (Len=14) + "AABBCCDD" + "1234\0\0" + Checksum
    const configKey = 'AABBCCDD';
    const code = '1234';
    const packet = new CreateSingleUseCodePacket(configKey, code);
    const binary = packet.toPacket();

    const toHex = (buffer: Uint8Array) =>
      Array.from(buffer)
        .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
        .join(' ');

    // Sum: 18 + 14 + 532 (Key) + 202 (Code) = 766 -> 0xFE
    const expectedHex = '12 0E 41 41 42 42 43 43 44 44 31 32 33 34 00 00 FE';
    expect(toHex(binary)).toBe(expectedHex);
  });

  it('should generate exact hardcoded binary for CreateMultiUseCodePacket', () => {
    // 0x13 (Op) + 0x0E (Len=14) + "AABBCCDD" + "1234\0\0" + Checksum
    const configKey = 'AABBCCDD';
    const code = '1234';
    const packet = new CreateMultiUseCodePacket(configKey, code);
    const binary = packet.toPacket();

    const toHex = (buffer: Uint8Array) =>
      Array.from(buffer)
        .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
        .join(' ');

    // Sum: 19 + 14 + 532 + 202 = 767 -> 0xFF
    const expectedHex = '13 0E 41 41 42 42 43 43 44 44 31 32 33 34 00 00 FF';
    expect(toHex(binary)).toBe(expectedHex);
  });

  it('should generate exact hardcoded binary for DeleteMasterCodePacket', () => {
    // 0x0C (Op) + 0x09 (Len) + "AABBCCDD" + 0x01 (Index) + Checksum
    const configKey = 'AABBCCDD';
    const index = 1;
    const packet = new DeleteMasterCodePacket(configKey, index);
    const binary = packet.toPacket();

    const toHex = (buffer: Uint8Array) =>
      Array.from(buffer)
        .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
        .join(' ');

    // Sum: 12 + 9 + 532 + 1 = 554 -> 554 % 256 = 42 -> 0x2A
    const expectedHex = '0C 09 41 41 42 42 43 43 44 44 01 2A';
    expect(toHex(binary)).toBe(expectedHex);
  });

  it('should generate exact hardcoded binary for DeleteSingleUseCodePacket', () => {
    // 0x0D (Op) + 0x0E (Len=14) + "AABBCCDD" + "1234\0\0" + Checksum
    const configKey = 'AABBCCDD';
    const code = '1234';
    const packet = new DeleteSingleUseCodePacket(configKey, code);
    const binary = packet.toPacket();

    const toHex = (buffer: Uint8Array) =>
      Array.from(buffer)
        .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
        .join(' ');

    // Sum: 13 + 14 + 532 + 202 = 761 -> 761 % 256 = 249 -> 0xF9
    const expectedHex = '0D 0E 41 41 42 42 43 43 44 44 31 32 33 34 00 00 F9';
    expect(toHex(binary)).toBe(expectedHex);
  });

  it('should generate exact hardcoded binary for DeleteMultiUseCodePacket', () => {
    // 0x0E (Op) + 0x0E (Len=14) + "AABBCCDD" + "1234\0\0" + Checksum
    const configKey = 'AABBCCDD';
    const code = '1234';
    const packet = new DeleteMultiUseCodePacket(configKey, code);
    const binary = packet.toPacket();

    const toHex = (buffer: Uint8Array) =>
      Array.from(buffer)
        .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
        .join(' ');

    // Sum: 14 + 14 + 532 + 202 = 762 -> 762 % 256 = 250 -> 0xFA
    const expectedHex = '0E 0E 41 41 42 42 43 43 44 44 31 32 33 34 00 00 FA';
    expect(toHex(binary)).toBe(expectedHex);
  });
});
