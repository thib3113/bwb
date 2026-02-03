import {describe, expect, it} from 'vitest';
import {SetConfigurationPacket} from '../../ble/packets/SetConfigurationPacket';
import {BLEOpcode} from '../../utils/bleConstants';

describe('SetConfig Packet (0x16)', () => {
  const configKey = 'ABCDEFGH';

  it('should construct SetConfig full packet for La Poste Mode (0x01)', () => {
    const configType = 0x01; // La Poste
    const enable = 0x01; // Enable
    const packet = new SetConfigurationPacket(configKey, configType, enable);
    const fullPacket = packet.toPacket();

    // Payload: Key(8) + Type(1) + Value(1) = 10 bytes
    // Total: 1+1+10+1 = 13 bytes

    expect(fullPacket[0]).toBe(BLEOpcode.SET_CONFIGURATION);
    expect(fullPacket[1]).toBe(10);
    expect(String.fromCharCode(...fullPacket.slice(2, 10))).toBe(configKey);
    expect(fullPacket[10]).toBe(configType);
    expect(fullPacket[11]).toBe(enable);
    expect(fullPacket.length).toBe(13);
  });

  it('should generate exact hardcoded binary for SetConfigurationPacket', () => {
    // 0x16 (Op) + 0x0A (Len=10) + "ABCDEFGH" + 0x01 + 0x01 + Checksum
    const configKey = 'ABCDEFGH';
    const configType = 0x01;
    const enable = 0x01;
    const packet = new SetConfigurationPacket(configKey, configType, enable);
    const binary = packet.toPacket();

    const toHex = (buffer: Uint8Array) =>
      Array.from(buffer).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');

    // Sum: 22 + 10 + 548 (Key) + 1 + 1 = 582 -> 582 % 256 = 70 -> 0x46
    const expectedHex = "16 0A 41 42 43 44 45 46 47 48 01 01 46";
    expect(toHex(binary)).toBe(expectedHex);
  });
});
