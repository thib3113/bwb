import { describe, expect, it } from 'vitest';
import { GetLogsCountPacket } from '../../ble/packets/GetLogsCountPacket';
import { RequestLogsPacket } from '../../ble/packets/RequestLogsPacket';
import { BLEOpcode } from '../../utils/bleConstants';

describe('Log Packets', () => {
  it('should construct GetLogsCount (0x07) full packet', () => {
    const packet = new GetLogsCountPacket();
    const fullPacket = packet.toPacket();
    // [0x07, 0x00, Checksum]
    expect(fullPacket[0]).toBe(BLEOpcode.GET_LOGS_COUNT);
    expect(fullPacket[1]).toBe(0);
    expect(fullPacket.length).toBe(3);
  });

  it('should construct RequestLogs (0x03) full packet', () => {
    const packet = new RequestLogsPacket();
    const fullPacket = packet.toPacket();
    // [0x03, 0x00, Checksum]
    expect(fullPacket[0]).toBe(BLEOpcode.REQUEST_LOGS);
    expect(fullPacket[1]).toBe(0);
    expect(fullPacket.length).toBe(3);
  });

  it('should generate exact hardcoded binary for RequestLogsPacket', () => {
    // Opcode: 0x03 (3)
    // Len: 0
    // Checksum: 3
    const packet = new RequestLogsPacket();
    const binary = packet.toPacket();

    const toHex = (buffer: Uint8Array) =>
      Array.from(buffer)
        .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
        .join(' ');

    const expectedHex = '03 00 03';
    expect(toHex(binary)).toBe(expectedHex);
  });

  it('should generate exact hardcoded binary for GetLogsCountPacket', () => {
    // Opcode: 0x07 (7)
    // Len: 0
    // Checksum: 7
    const packet = new GetLogsCountPacket();
    const binary = packet.toPacket();

    const toHex = (buffer: Uint8Array) =>
      Array.from(buffer)
        .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
        .join(' ');

    const expectedHex = '07 00 07';
    expect(toHex(binary)).toBe(expectedHex);
  });
});
