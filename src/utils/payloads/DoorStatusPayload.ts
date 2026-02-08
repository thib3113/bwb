import { BLEOpcode } from '../bleConstants';
import { BasePayload } from './BasePayload';

export class DoorStatusPayload extends BasePayload {
  static OPCODES = [BLEOpcode.NOTIFY_DOOR_STATUS, BLEOpcode.ANSWER_DOOR_STATUS];
  status: 'open' | 'closed';

  constructor(opcode: number, payload: Uint8Array, raw: Uint8Array) {
    super(opcode, payload, raw);
    // Byte 1 is raw door status (0: closed, 1: open)
    this.status = payload[1] === 1 ? 'open' : 'closed';
  }
}
