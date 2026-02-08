import {describe, expect, it} from 'vitest';
import {OpenDoorPacket} from '../../ble/packets/OpenDoorPacket';
import {BLEOpcode} from '../../utils/bleConstants';

describe('OpenDoorPacket (0x01)', () => {
  it('should construct a valid Open Door full packet', () => {
    const pinCode = '123456';
    const packet = new OpenDoorPacket(pinCode);
    const fullPacket = packet.toPacket();

    // Packet Structure: [Opcode, Len, ...Payload, Checksum]
    // Payload: "123456" (6 bytes)
    // Total Length: 1 (Op) + 1 (Len) + 6 (Payload) + 1 (Checksum) = 9 bytes

    expect(fullPacket.length).toBe(9);
    expect(fullPacket[0]).toBe(BLEOpcode.OPEN_DOOR);
    expect(fullPacket[1]).toBe(6); // Length of payload
    expect(String.fromCharCode(...fullPacket.slice(2, 8))).toBe('123456');

    // Checksum: (Opcode + Len + PayloadBytes) & 0xFF ??
    // Wait, createPacket logic in packetParser.ts says:
    // const checksum = packet.slice(0, -1).reduce((a, b) => a + b, 0) & 255;
    // Let's verify our BoksTXPacket.ts implementation matches that.

    let sum = 0;
    for (let i = 0; i < 8; i++) sum += fullPacket[i];
    expect(fullPacket[8]).toBe(sum & 0xFF);
  });

  it('should generate exact hardcoded binary for "1234"', () => {
    // Opcode: 0x01, Len: 0x04, Payload: "1234" (0x31-34), Checksum: 0xCF
    const pin = '1234';
    const packet = new OpenDoorPacket(pin);
    const binary = packet.toPacket();

    const toHex = (buffer: Uint8Array) =>
      Array.from(buffer).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');

    const expectedHex = "01 04 31 32 33 34 CF";
    expect(toHex(binary)).toBe(expectedHex);
  });
});
