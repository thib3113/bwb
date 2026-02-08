import { describe, expect, it } from 'vitest';
import { KeyOpeningLogPayload } from '../logs/KeyOpeningLogPayload';
import { BLEOpcode } from '../../bleConstants';

describe('KeyOpeningLogPayload', () => {
  it('should parse correctly', () => {
    const instance = new KeyOpeningLogPayload(BLEOpcode.LOG_EVENT_KEY_OPENING, new Uint8Array([0, 0, 0]), new Uint8Array());
    expect(instance).toBeDefined();
  });
});
