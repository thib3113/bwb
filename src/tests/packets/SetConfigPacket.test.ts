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
});
