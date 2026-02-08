import { describe, expect, it } from 'vitest';
import { DoorCloseLogPayload } from '../logs/DoorCloseLogPayload';
import { BLEOpcode } from '../../bleConstants';

describe('DoorCloseLogPayload', () => {
  it('should parse correctly', () => {
    const opcode = BLEOpcode.LOG_DOOR_CLOSE;
    const payload = new Uint8Array([0x00, 0x00, 0x01]);
    const instance = new DoorCloseLogPayload(opcode, payload, new Uint8Array());
    expect(instance.age).toBe(1);
  });
});
