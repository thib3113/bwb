import {describe, expect, it} from 'vitest';
import {DoorStatusPacket, LogCountPacket, NfcTagFoundPacket,} from '../../../ble/packets/rx/ResponsePackets';
import {BLEOpcode} from '../../../utils/bleConstants';

describe('RX Packets Parsing', () => {
  it('should parse LogCountPacket (Uint16)', () => {
    const packet = new LogCountPacket();
    // 5 logs: [0x05, 0x00] (Little Endian)
    packet.parse(new Uint8Array([0x05, 0x00]));
    expect(packet.count).toBe(5);

    // 258 logs: [0x02, 0x01] (256 + 2)
    packet.parse(new Uint8Array([0x02, 0x01]));
    expect(packet.count).toBe(258);
  });

  it('should parse DoorStatusPacket', () => {
    const packetOpen = new DoorStatusPacket(BLEOpcode.NOTIFY_DOOR_STATUS);
    packetOpen.parse(new Uint8Array([0x01]));
    expect(packetOpen.isOpen).toBe(true);

    const packetClosed = new DoorStatusPacket(BLEOpcode.NOTIFY_DOOR_STATUS);
    packetClosed.parse(new Uint8Array([0x00]));
    expect(packetClosed.isOpen).toBe(false);
  });

  it('should parse NfcTagFoundPacket', () => {
    const packet = new NfcTagFoundPacket();
    // UID: AABBCCDD
    packet.parse(new Uint8Array([0XAA, 0XBB, 0XCC, 0XDD]));
    expect(packet.uid).toBe('AA:BB:CC:DD');
    expect(packet.uidBytes).toEqual(new Uint8Array([0XAA, 0XBB, 0XCC, 0XDD]));
  });
});
