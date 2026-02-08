import { BasePayload } from './BasePayload';

export class DoorStatusPayload extends BasePayload {
  status: 'open' | 'closed';

  constructor(opcode: number, payload: Uint8Array, raw: Uint8Array) {
    super(opcode, payload, raw);
    // Byte 1 is raw door status (0: closed, 1: open)
    this.status = payload[1] === 1 ? 'open' : 'closed';
  }
}
