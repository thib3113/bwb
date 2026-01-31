import { describe, it, expect } from 'vitest';
import { PacketFactory } from '../../ble/packets/PacketFactory';
import { BLEOpcode } from '../../utils/bleConstants';
import {
  OperationSuccessPacket,
  DoorStatusPacket,
  LogCountPacket
} from '../../ble/packets/rx/ResponsePackets';

describe('PacketFactory', () => {

  it('should create OperationSuccessPacket for 0x77', () => {
    const packet = PacketFactory.create(BLEOpcode.CODE_OPERATION_SUCCESS, new Uint8Array(0));
    expect(packet).toBeInstanceOf(OperationSuccessPacket);
    expect(packet?.opcode).toBe(BLEOpcode.CODE_OPERATION_SUCCESS);
  });

  it('should create DoorStatusPacket for 0x84 and 0x85', () => {
    const p1 = PacketFactory.create(BLEOpcode.NOTIFY_DOOR_STATUS, new Uint8Array([1]));
    expect(p1).toBeInstanceOf(DoorStatusPacket);
    expect((p1 as DoorStatusPacket).isOpen).toBe(true);

    const p2 = PacketFactory.create(BLEOpcode.ANSWER_DOOR_STATUS, new Uint8Array([0]));
    expect(p2).toBeInstanceOf(DoorStatusPacket);
    expect((p2 as DoorStatusPacket).isOpen).toBe(false);
  });

  it('should create LogCountPacket for 0x79', () => {
    const packet = PacketFactory.create(BLEOpcode.NOTIFY_LOGS_COUNT, new Uint8Array([10, 0]));
    expect(packet).toBeInstanceOf(LogCountPacket);
    expect((packet as LogCountPacket).count).toBe(10);
  });

  it('should return null for unknown opcode', () => {
    const packet = PacketFactory.create(0xFF, new Uint8Array(0));
    expect(packet).toBeNull();
  });

  // TX Packet Tests
  it('should create OpenDoorPacket (TX) from payload', () => {
    const pin = "123456";
    const payload = new TextEncoder().encode(pin);
    const packet = PacketFactory.createTX(BLEOpcode.OPEN_DOOR, payload);

    expect(packet).toBeDefined();
    expect(packet?.opcode).toBe(BLEOpcode.OPEN_DOOR);
    // @ts-ignore - Dynamic check
    expect(packet.pinCode).toBe(pin);
  });

  it('should create SetConfigurationPacket (TX) from payload', () => {
    const key = "CONFIGKY";
    const type = 1;
    const value = 99;
    const payload = new Uint8Array([...new TextEncoder().encode(key), type, value]);

    const packet = PacketFactory.createTX(BLEOpcode.SET_CONFIGURATION, payload);
    expect(packet).toBeDefined();
    // @ts-ignore
    expect(packet.configKey).toBe(key);
    // @ts-ignore
    expect(packet.configType).toBe(type);
    // @ts-ignore
    expect(packet.configValue).toBe(value);
  });
});
