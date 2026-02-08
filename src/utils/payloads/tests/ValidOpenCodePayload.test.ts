import { describe, expect, it } from 'vitest';
import { ValidOpenCodePayload } from '../ValidOpenCodePayload';
import { BLEOpcode } from '../../bleConstants';

describe('ValidOpenCodePayload', () => {
  it('should parse correctly', () => {
    const payload = new Uint8Array([0x31, 0x32, 0x33, 0x34, 0x35, 0x36]);
    const instance = new ValidOpenCodePayload(
      BLEOpcode.VALID_OPEN_CODE,
      payload,
      new Uint8Array()
    );
    expect(instance.code).toBe('123456');
  });
});
