import { ParsedPayload } from './base';

export class CodeOperationSuccessPayload implements ParsedPayload {
  opcode: number;
  payload: Uint8Array;
  raw: Uint8Array;

  constructor(opcode: number, payload: Uint8Array, raw: Uint8Array) {
    this.opcode = opcode;
    this.payload = payload;
    this.raw = raw;
  }

  toString(): string {
    return 'Code Operation: Success';
  }

  toDetails(): Record<string, unknown> {
    return {
      success: true,
    };
  }
}
