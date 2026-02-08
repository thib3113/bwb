import { BLEOpcode } from '../bleConstants';
import { BasePayload } from './BasePayload';

export class NotifyLogsCountPayload extends BasePayload {
  static OPCODES = [BLEOpcode.NOTIFY_LOGS_COUNT];
  count: number;

  constructor(opcode: number, payload: Uint8Array, raw: Uint8Array) {
    super(opcode, payload, raw);
    this.count = (payload[1] << 8) | payload[0];
  }
}
