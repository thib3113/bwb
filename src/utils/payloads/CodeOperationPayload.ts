import { BasePayload } from './BasePayload';

export class CodeOperationPayload extends BasePayload {
  success: boolean;

  constructor(opcode: number, payload: Uint8Array, raw: Uint8Array) {
    super(opcode, payload, raw);
    this.success = opcode === 0x77;
  }
}
