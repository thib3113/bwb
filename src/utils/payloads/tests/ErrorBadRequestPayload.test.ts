import { describe, expect, it } from 'vitest';
import { ErrorBadRequestPayload } from '../ErrorBadRequestPayload';
import { BLEOpcode } from '../../bleConstants';

describe('ErrorBadRequestPayload', () => {
  it('should parse correctly', () => {
    const instance = new ErrorBadRequestPayload(BLEOpcode.ERROR_BAD_REQUEST, new Uint8Array([0x01]), new Uint8Array());
    expect(instance.errorCode).toBe(1);
  });
});
