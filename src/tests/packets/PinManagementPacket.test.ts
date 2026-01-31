import { describe, it, expect } from 'vitest';
import { 
  CreateMasterCodePacket, 
  CreateSingleUseCodePacket, 
  DeleteMasterCodePacket 
} from '../../ble/packets/PinManagementPackets';
import { BLEOpcode } from '../../utils/bleConstants';

describe('Pin Management Packets (Full Suite)', () => {
  const configKey = "ABCDEFGH";
  const code = "9999";
  const index = 2;

  it('should construct CreateMasterCode (0x11) full packet', () => {
    const packet = new CreateMasterCodePacket(configKey, index, code);
    const fullPacket = packet.toPacket();
    
    // Payload: Key(8) + Index(1) + Code(4) = 13 bytes
    // Total: 1(Op) + 1(Len) + 13(Payload) + 1(Checksum) = 16 bytes
    
    expect(fullPacket[0]).toBe(BLEOpcode.CREATE_MASTER_CODE);
    expect(fullPacket[1]).toBe(13); 
    expect(String.fromCharCode(...fullPacket.slice(2, 10))).toBe(configKey);
    expect(fullPacket[10]).toBe(index);
    expect(String.fromCharCode(...fullPacket.slice(11, 15))).toBe(code);
    expect(fullPacket.length).toBe(16);
  });

  it('should construct CreateSingleUseCode (0x12) full packet', () => {
    const packet = new CreateSingleUseCodePacket(configKey, code);
    const fullPacket = packet.toPacket();
    
    // Payload: Key(8) + Code(4) = 12 bytes
    // Total: 1+1+12+1 = 15 bytes
    
    expect(fullPacket[0]).toBe(BLEOpcode.CREATE_SINGLE_USE_CODE);
    expect(fullPacket[1]).toBe(12);
    expect(String.fromCharCode(...fullPacket.slice(2, 10))).toBe(configKey);
    expect(String.fromCharCode(...fullPacket.slice(10, 14))).toBe(code);
    expect(fullPacket.length).toBe(15);
  });

  it('should construct DeleteMasterCode (0x0C) full packet', () => {
    const packet = new DeleteMasterCodePacket(configKey, index);
    const fullPacket = packet.toPacket();
    
    // Payload: Key(8) + Index(1) = 9 bytes
    // Total: 1+1+9+1 = 12 bytes
    
    expect(fullPacket[0]).toBe(BLEOpcode.DELETE_MASTER_CODE);
    expect(fullPacket[1]).toBe(9);
    expect(String.fromCharCode(...fullPacket.slice(2, 10))).toBe(configKey);
    expect(fullPacket[10]).toBe(index);
    expect(fullPacket.length).toBe(12);
  });
});