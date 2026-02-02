import {describe, expect, it} from 'vitest';
import {AskDoorStatusPacket, CountCodesPacket, TestBatteryPacket,} from '../../ble/packets/StatusPackets';
import {BLEOpcode} from '../../utils/bleConstants';

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

  it('should generate exact hardcoded binary for AskDoorStatusPacket', () => {
    // 0x02, 0x00, 0x02
    const packet = new AskDoorStatusPacket();
    const binary = packet.toPacket();

    const toHex = (buffer: Uint8Array) =>
      Array.from(buffer).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');

    const expectedHex = "02 00 02";
    expect(toHex(binary)).toBe(expectedHex);
  });

  it('should generate exact hardcoded binary for TestBatteryPacket', () => {
    // 0x08, 0x00, 0x08
    const packet = new TestBatteryPacket();
    const binary = packet.toPacket();

    const toHex = (buffer: Uint8Array) =>
      Array.from(buffer).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');

    const expectedHex = "08 00 08";
    expect(toHex(binary)).toBe(expectedHex);
  });

  it('should generate exact hardcoded binary for CountCodesPacket', () => {
    // 0x14 (20), 0x00, 0x14 (20)
    const packet = new CountCodesPacket();
    const binary = packet.toPacket();

    const toHex = (buffer: Uint8Array) =>
      Array.from(buffer).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');

    const expectedHex = "14 00 14";
    expect(toHex(binary)).toBe(expectedHex);
  });
});
