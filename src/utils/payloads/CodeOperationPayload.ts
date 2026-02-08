import { BLEOpcode } from '../bleConstants';
import { BasePayload } from './BasePayload';

export class CodeOperationPayload extends BasePayload {
  static OPCODES = [BLEOpcode.CODE_OPERATION_SUCCESS, BLEOpcode.CODE_OPERATION_ERROR];
  success: boolean;

  constructor(opcode: number, payload: Uint8Array, raw: Uint8Array) {
    super(opcode, payload, raw);
    this.success = opcode === BLEOpcode.CODE_OPERATION_SUCCESS;
  }
}
