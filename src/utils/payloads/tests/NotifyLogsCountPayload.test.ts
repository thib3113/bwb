import { describe, it, expect } from 'vitest';
import { NotifyLogsCountPayload } from '../NotifyLogsCountPayload';
import { BLEOpcode } from '../../bleConstants';

describe('NotifyLogsCountPayload', () => {
  it('should parse count correctly (Little Endian)', () => {
    const opcode = BLEOpcode.NOTIFY_LOGS_COUNT;
    const payload = new Uint8Array([0x05, 0x01]); // 256 + 5 = 261
    const instance = new NotifyLogsCountPayload(opcode, payload, new Uint8Array());
    expect(instance.count).toBe(261);
  });
});
