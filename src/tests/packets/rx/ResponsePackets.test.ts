import {describe, expect, it} from 'vitest';
import {DoorStatusPacket} from '../../../ble/packets/rx/DoorStatusPacket';
import {LogCountPacket} from '../../../ble/packets/rx/LogCountPacket';
import {NfcScanResultPacket} from '../../../ble/packets/rx/NfcScanResultPacket';
import {BLEOpcode} from '../../../utils/bleConstants';

describe('RX Packets Parsing', () => {
  it('should have correct static opcodes', () => {
    // Verify static getters resolve correctly at runtime
    expect(LogCountPacket.opcode).toBe(BLEOpcode.NOTIFY_LOGS_COUNT);
    expect(DoorStatusPacket.opcode_push).toBe(BLEOpcode.NOTIFY_DOOR_STATUS);
    expect(DoorStatusPacket.opcode_pull).toBe(BLEOpcode.ANSWER_DOOR_STATUS);
    expect(NfcScanResultPacket.opcodes).toContain(BLEOpcode.NOTIFY_NFC_TAG_REGISTER_SCAN_RESULT);
  });

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

  it('should parse NfcScanResultPacket', () => {
    const packet = new NfcScanResultPacket(BLEOpcode.NOTIFY_NFC_TAG_REGISTER_SCAN_RESULT);
    // UID: AABBCCDD (Len: 4)
    packet.parse(new Uint8Array([0x04, 0XAA, 0XBB, 0XCC, 0XDD]));
    expect(packet.uid).toBe('AA:BB:CC:DD');
    expect(packet.status).toBe('found');
  });
});
