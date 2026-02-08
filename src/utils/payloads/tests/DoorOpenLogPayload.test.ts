import { describe, expect, it } from 'vitest';
import { DoorOpenLogPayload } from '../logs/DoorOpenLogPayload';
import { BLEOpcode } from '../../bleConstants';

describe('DoorOpenLogPayload', () => {
  it('should parse correctly', () => {
    const opcode = BLEOpcode.LOG_DOOR_OPEN;
    const payload = new Uint8Array([0x00, 0x00, 0x01]);
    const instance = new DoorOpenLogPayload(opcode, payload, new Uint8Array());
    expect(instance.age).toBe(1);
  });
});
