import { describe, it, expect } from 'vitest';
import { AskDoorStatusPacket, TestBatteryPacket, CountCodesPacket } from '../../ble/packets/StatusPackets';
import { BLEOpcode } from '../../utils/bleConstants';

describe('Status Packets', () => {
  it('should construct AskDoorStatus (0x02) full packet', () => {
    const packet = new AskDoorStatusPacket();
    const fullPacket = packet.toPacket();
    // [0x02, 0x00, Checksum]
    expect(fullPacket[0]).toBe(BLEOpcode.ASK_DOOR_STATUS);
    expect(fullPacket[1]).toBe(0);
    expect(fullPacket.length).toBe(3);
  });

  it('should construct TestBattery (0x08) full packet', () => {
    const packet = new TestBatteryPacket();
    const fullPacket = packet.toPacket();
    expect(fullPacket[0]).toBe(BLEOpcode.TEST_BATTERY);
    expect(fullPacket[1]).toBe(0);
    expect(fullPacket.length).toBe(3);
  });

  it('should construct CountCodes (0x14) full packet', () => {
    const packet = new CountCodesPacket();
    const fullPacket = packet.toPacket();
    expect(fullPacket[0]).toBe(BLEOpcode.COUNT_CODES);
    expect(fullPacket[1]).toBe(0);
    expect(fullPacket.length).toBe(3);
  });
});