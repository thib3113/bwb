import { describe, expect, it } from 'vitest';
import { ErrorCrcPayload } from '../ErrorCrcPayload';
import { BLEOpcode } from '../../bleConstants';

describe('ErrorCrcPayload', () => {
  it('should parse correctly', () => {
    const instance = new ErrorCrcPayload(BLEOpcode.ERROR_CRC, new Uint8Array([0x01]), new Uint8Array());
    expect(instance.errorCode).toBe(1);
  });
});
