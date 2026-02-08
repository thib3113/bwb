import { describe, expect, it } from 'vitest';
import { NotifyCodesCountPayload } from '../NotifyCodesCountPayload';
import { BLEOpcode } from '../../bleConstants';

describe('NotifyCodesCountPayload', () => {
  it('should parse correctly', () => {
    const payload = new Uint8Array([0x00, 0x05, 0x00, 0x0A]);
    const instance = new NotifyCodesCountPayload(BLEOpcode.NOTIFY_CODES_COUNT, payload, new Uint8Array());
    expect(instance.master).toBe(5);
    expect(instance.single).toBe(10);
  });
});
