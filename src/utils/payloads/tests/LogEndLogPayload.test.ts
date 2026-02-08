import { describe, expect, it } from 'vitest';
import { LogEndLogPayload } from '../logs/LogEndLogPayload';
import { BLEOpcode } from '../../bleConstants';

describe('LogEndLogPayload', () => {
  it('should parse correctly', () => {
    const instance = new LogEndLogPayload(BLEOpcode.LOG_END, new Uint8Array([0, 0, 0]), new Uint8Array());
    expect(instance).toBeDefined();
  });
});
