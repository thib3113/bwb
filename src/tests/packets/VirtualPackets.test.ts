import { describe, it, expect } from 'vitest';
import { RawTXPacket } from '../../ble/packets/RawTXPacket';
import { GattOperationPacket } from '../../ble/packets/GattOperationPacket';
import { BLEOpcode } from '../../utils/bleConstants';

describe('Virtual Packets (Raw & Gatt)', () => {
  it('RawTXPacket should wrap opcode and payload correctly', () => {
    const opcode = 0x99;
    const payload = new Uint8Array([1, 2, 3]);
    const packet = new RawTXPacket(opcode, payload);

    expect(packet.opcode).toBe(opcode);
    expect(packet.toPayload()).toBe(payload);

    // toPacket check: [Op, Len, ...Payload, Checksum]
    const full = packet.toPacket();
    expect(full[0]).toBe(opcode);
    expect(full[1]).toBe(3);
    expect(full[2]).toBe(1);
    // Checksum: (0x99 + 3 + 1 + 2 + 3) & 0xFF
    // 153 + 3 + 6 = 162 (0xA2)
    expect(full[full.length - 1]).toBe(162);
  });

  it('GattOperationPacket should encode UUID as payload', () => {
    const uuid = '0000180a-0000-1000-8000-00805f9b34fb';
    const packet = new GattOperationPacket(uuid, 'Test Read');

    expect(packet.opcode).toBe(BLEOpcode.INTERNAL_GATT_OPERATION); // 0xFE

    const payload = packet.toPayload();
    const decoded = new TextDecoder().decode(payload);
    expect(decoded).toBe(uuid);

    expect(packet.toString()).toBe('Test Read');
    const details = packet.toDetails();
    expect(details.uuid).toBe(uuid);
    expect(details.description).toBe('Test Read');
  });
});
