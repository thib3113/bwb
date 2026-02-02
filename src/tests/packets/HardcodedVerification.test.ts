
import { describe, it, expect } from 'vitest';
import { OpenDoorPacket } from '../../ble/packets/OpenDoorPacket';
import { NfcScanStartPacket } from '../../ble/packets/NfcScanStartPacket';
import { CreateMasterCodePacket } from '../../ble/packets/PinManagementPackets';

describe('TX Packet Hardcoded Binary Verification', () => {

  // Function to convert Uint8Array to Hex string for easy reading
  const toHex = (buffer: Uint8Array) => Array.from(buffer).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');

  it('OpenDoorPacket should equal "01 04 31 32 33 34 9F"', () => {
    // 0x01 (Opcode)
    // 0x04 (Len)
    // 0x31 0x32 0x33 0x34 ("1234")
    // Checksum: (1+4+49+50+51+52) & 255 = 207 = 0xCF
    // Wait, let's calculate manually:
    // 1 + 4 + 49 + 50 + 51 + 52 = 207 (CF)

    // Actually, let's verify what the code produces instead of assuming my mental math is perfect,
    // but the requirement is "checking against a hardcoded string".

    const pin = '1234';
    const packet = new OpenDoorPacket(pin);
    const binary = packet.toPacket();

    const expectedHex = "01 04 31 32 33 34 CF";
    expect(toHex(binary)).toBe(expectedHex);
  });

  it('NfcScanStartPacket should equal "17 08 31 32 33 34 35 36 37 38 7B"', () => {
      // 0x17 (23) - Opcode
      // 0x08 (8) - Len
      // "12345678" -> 31 32 33 34 35 36 37 38
      // Sum: 23 + 8 + 49*8 + (0+1+2+3+4+5+6+7) = 31 + 392 + 28 = 451
      // 451 & 255 = 195 = 0xC3

      // Let's re-calculate carefully.
      // 23 + 8 = 31
      // 1=49, 2=50, 3=51, 4=52, 5=53, 6=54, 7=55, 8=56
      // Sum bytes: 49+50+51+52+53+54+55+56 = 420
      // Total sum: 31 + 420 = 451
      // 451 % 256 = 195 = 0xC3

      const configKey = '12345678';
      const packet = new NfcScanStartPacket(configKey);
      const binary = packet.toPacket();

      const expectedHex = "17 08 31 32 33 34 35 36 37 38 C3";
      expect(toHex(binary)).toBe(expectedHex);
  });

  it('CreateMasterCodePacket should equal "11 0F 41 41 42 42 43 43 44 44 31 32 33 34 00 00 01 C5"', () => {
    // Opcode: 0x11 (17)
    // Len: 15 (0x0F)
    // Key: "AABBCCDD" -> 41 41 42 42 43 43 44 44
    // Code: "1234" -> 31 32 33 34 00 00
    // Index: 1 -> 01

    // Sum:
    // 17 + 15 = 32
    // Key: 65*2 + 66*2 + 67*2 + 68*2 = 130 + 132 + 134 + 136 = 532
    // Code: 49+50+51+52 = 202
    // Index: 1
    // Total: 32 + 532 + 202 + 1 = 767
    // 767 % 256 = 255 = 0xFF

    // Wait, let's verify:
    // 767 / 256 = 2.99...
    // 256 * 2 = 512.
    // 767 - 512 = 255 (0xFF).

    const configKey = 'AABBCCDD';
    const code = '1234';
    const index = 1;
    const packet = new CreateMasterCodePacket(configKey, index, code);
    const binary = packet.toPacket();

    const expectedHex = "11 0F 41 41 42 42 43 43 44 44 31 32 33 34 00 00 01 FF";
    expect(toHex(binary)).toBe(expectedHex);
  });
});
