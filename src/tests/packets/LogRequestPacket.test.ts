import {describe, expect, it} from 'vitest';
import {GetLogsCountPacket} from '../../ble/packets/GetLogsCountPacket';
import {RequestLogsPacket} from '../../ble/packets/RequestLogsPacket';
import {BLEOpcode} from '../../utils/bleConstants';

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
});
