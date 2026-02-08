import { describe, expect, it } from 'vitest';
import { LogEraseLogPayload } from '../logs/LogEraseLogPayload';
import { BLEOpcode } from '../../bleConstants';

describe('LogEraseLogPayload', () => {
  it('should parse correctly', () => {
    const instance = new LogEraseLogPayload(BLEOpcode.LOG_ERASE, new Uint8Array([0, 0, 0]), new Uint8Array());
    expect(instance).toBeDefined();
  });
});
