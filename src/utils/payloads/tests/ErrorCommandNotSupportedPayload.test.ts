import { describe, expect, it } from 'vitest';
import { ErrorCommandNotSupportedPayload } from '../ErrorCommandNotSupportedPayload';
import { BLEOpcode } from '../../bleConstants';

describe('ErrorCommandNotSupportedPayload', () => {
  it('should parse correctly', () => {
    const instance = new ErrorCommandNotSupportedPayload(BLEOpcode.ERROR_COMMAND_NOT_SUPPORTED, new Uint8Array([0x01]), new Uint8Array());
    expect(instance.errorCode).toBe(1);
  });
});
