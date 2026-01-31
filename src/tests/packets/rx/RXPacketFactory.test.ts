import { describe, it, expect } from 'vitest';
import { RXPacketFactory } from '../../../ble/packets/RXPacketFactory';
import { BLEOpcode } from '../../../utils/bleConstants';
import { 
  OperationSuccessPacket, 
  DoorStatusPacket, 
  LogCountPacket 
} from '../../../ble/packets/rx/ResponsePackets';

describe('RXPacketFactory', () => {
  
  it('should create OperationSuccessPacket for 0x77', () => {
    const packet = RXPacketFactory.create(BLEOpcode.CODE_OPERATION_SUCCESS, new Uint8Array(0));
    expect(packet).toBeInstanceOf(OperationSuccessPacket);
    expect(packet?.opcode).toBe(BLEOpcode.CODE_OPERATION_SUCCESS);
  });

  it('should create DoorStatusPacket for 0x84 and 0x85', () => {
    const p1 = RXPacketFactory.create(BLEOpcode.NOTIFY_DOOR_STATUS, new Uint8Array([1]));
    expect(p1).toBeInstanceOf(DoorStatusPacket);
    expect((p1 as DoorStatusPacket).isOpen).toBe(true);

    const p2 = RXPacketFactory.create(BLEOpcode.ANSWER_DOOR_STATUS, new Uint8Array([0]));
    expect(p2).toBeInstanceOf(DoorStatusPacket);
    expect((p2 as DoorStatusPacket).isOpen).toBe(false);
  });

  it('should create LogCountPacket for 0x79', () => {
    const packet = RXPacketFactory.create(BLEOpcode.NOTIFY_LOGS_COUNT, new Uint8Array([10, 0]));
    expect(packet).toBeInstanceOf(LogCountPacket);
    expect((packet as LogCountPacket).count).toBe(10);
  });

  it('should return null for unknown opcode', () => {
    const packet = RXPacketFactory.create(0xFF, new Uint8Array(0));
    expect(packet).toBeNull();
  });
});
