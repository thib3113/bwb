import { describe, expect, it } from 'vitest';
import { ErrorUnauthorizedPayload } from '../ErrorUnauthorizedPayload';
import { BLEOpcode } from '../../bleConstants';

describe('ErrorUnauthorizedPayload', () => {
  it('should parse correctly', () => {
    const instance = new ErrorUnauthorizedPayload(BLEOpcode.ERROR_UNAUTHORIZED, new Uint8Array([0x01]), new Uint8Array());
    expect(instance.errorCode).toBe(1);
  });
});
