// Code operation success/error payload
import { ParsedPayload } from './base';
import { BLEOpcode } from '../bleConstants';

export class CodeOperationPayload implements ParsedPayload {
  opcode: number;
  payload: Uint8Array;
  raw: Uint8Array;
  success: boolean;

  constructor(opcode: number, payload: Uint8Array, raw: Uint8Array) {
    this.opcode = opcode;
    this.payload = payload;
    this.raw = raw;
    this.success = opcode === BLEOpcode.CODE_OPERATION_SUCCESS;
  }

  toString(): string {
    return `Code Operation: ${this.success ? 'Success' : 'Error'}`;
  }

  toDetails(): Record<string, unknown> {
    return {
      success: this.success,
    };
  }
}
