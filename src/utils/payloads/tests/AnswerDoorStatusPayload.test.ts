import { describe, expect, it } from 'vitest';
import { AnswerDoorStatusPayload } from '../AnswerDoorStatusPayload';
import { BLEOpcode } from '../../bleConstants';

describe('AnswerDoorStatusPayload', () => {
  it('should parse correctly', () => {
    const payload = new Uint8Array([0x00, 0x00]);
    const instance = new AnswerDoorStatusPayload(BLEOpcode.ANSWER_DOOR_STATUS, payload, new Uint8Array());
    expect(instance.isOpen).toBe(false);
  });
});
