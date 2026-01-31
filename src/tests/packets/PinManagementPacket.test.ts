import {describe, expect, it} from 'vitest';
import {
	CreateMasterCodePacket,
	CreateSingleUseCodePacket,
	DeleteMasterCodePacket,
} from '../../ble/packets/PinManagementPackets';
import {BLEOpcode} from '../../utils/bleConstants';

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
});
