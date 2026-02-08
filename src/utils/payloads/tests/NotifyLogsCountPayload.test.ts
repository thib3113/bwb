import { describe, expect, it } from 'vitest';
import { NotifyLogsCountPayload } from '../NotifyLogsCountPayload';
import { BLEOpcode } from '../../bleConstants';

describe('NotifyLogsCountPayload', () => {
  it('should parse correctly', () => {
    const payload = new Uint8Array([0x00, 0x2A]);
    const instance = new NotifyLogsCountPayload(BLEOpcode.NOTIFY_LOGS_COUNT, payload, new Uint8Array());
    expect(instance.count).toBe(42);
  });
});
