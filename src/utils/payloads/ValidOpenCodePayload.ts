import { ParsedPayload } from './base';

export class ValidOpenCodePayload implements ParsedPayload {
  opcode: number;
  payload: Uint8Array;
  raw: Uint8Array;
  code: string;

  constructor(opcode: number, payload: Uint8Array, raw: Uint8Array) {
    this.opcode = opcode;
    this.payload = payload;
    this.raw = raw;

    if (payload.length >= 6) {
      this.code = new TextDecoder().decode(payload.slice(0, 6)).replace(/\0/g, '');
    } else {
      this.code = '';
    }
  }

  toString(): string {
    return `Valid Open Code: ${this.code}`;
  }

  toDetails(): Record<string, unknown> {
    return {
      valid: true,
      code: this.code,
    };
  }
}
