import { describe, it, expect } from 'vitest';
import { RebootPacket } from '../../ble/packets/SystemPackets';
import { BLEOpcode } from '../../utils/bleConstants';

describe('System Packets', () => {
  it('should construct Reboot (0x06) full packet', () => {
    const packet = new RebootPacket();
    const fullPacket = packet.toPacket();
    // [0x06, 0x00, Checksum]
    expect(fullPacket[0]).toBe(BLEOpcode.REBOOT);
    expect(fullPacket[1]).toBe(0);
    expect(fullPacket.length).toBe(3);
  });
});