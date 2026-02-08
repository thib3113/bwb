import { describe, expect, it } from 'vitest';
import { BlockResetLogPayload } from '../logs/BlockResetLogPayload';
import { BLEOpcode } from '../../bleConstants';

describe('BlockResetLogPayload', () => {
  it('should parse correctly', () => {
    const instance = new BlockResetLogPayload(BLEOpcode.BLOCK_RESET, new Uint8Array([0, 0, 0]), new Uint8Array());
    expect(instance).toBeDefined();
  });
});
