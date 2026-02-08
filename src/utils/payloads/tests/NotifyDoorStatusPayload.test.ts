import { describe, expect, it } from 'vitest';
import { NotifyDoorStatusPayload } from '../NotifyDoorStatusPayload';
import { BLEOpcode } from '../../bleConstants';

describe('NotifyDoorStatusPayload', () => {
  it('should parse correctly', () => {
    const payload = new Uint8Array([0x00, 0x01]);
    const instance = new NotifyDoorStatusPayload(BLEOpcode.NOTIFY_DOOR_STATUS, payload, new Uint8Array());
    expect(instance.isOpen).toBe(true);
  });
});
