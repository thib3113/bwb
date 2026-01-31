import {describe, expect, it} from 'vitest';
import {OpenDoorPacket} from '../../ble/packets/OpenDoorPacket';
import {SetConfigurationPacket} from '../../ble/packets/SetConfigurationPacket';
import {CreateMasterCodePacket} from '../../ble/packets/PinManagementPackets';

describe('TX Packet Validation', () => {
  it('should throw if OpenDoorPacket has no pinCode', () => {
    const packet = new OpenDoorPacket('');
    expect(() => packet.toPayload()).toThrow('OpenDoorPacket: pinCode is required');
  });

  it('should throw if SetConfigurationPacket has no configKey', () => {
    const packet = new SetConfigurationPacket('', 1, 1);
    expect(() => packet.toPayload()).toThrow('SetConfigurationPacket: configKey is required');
  });

  it('should accept injected configKey in SetConfigurationPacket', () => {
    const packet = new SetConfigurationPacket('', 1, 1);
    expect(() => packet.toPayload('VALIDKEY')).not.toThrow();
  });

  it('should throw if CreateMasterCodePacket has no code', () => {
    const packet = new CreateMasterCodePacket('KEY', 1, '');
    expect(() => packet.toPayload()).toThrow('CreateMasterCodePacket: code is required');
  });
});
