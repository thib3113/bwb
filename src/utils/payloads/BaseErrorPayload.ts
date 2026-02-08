import { ParsedPayload } from './base';

export abstract class BaseErrorPayload implements ParsedPayload {
  opcode: number;
  payload: Uint8Array;
  raw: Uint8Array;
  errorCode: number;

  constructor(opcode: number, payload: Uint8Array, raw: Uint8Array) {
    this.opcode = opcode;
    this.payload = payload;
    this.raw = raw;
    this.errorCode = payload.length >= 1 ? payload[0] : 0;
  }

  abstract get errorMessage(): string;

  toString(): string {
    return `Error: ${this.errorMessage} (${this.errorCode})`;
  }

  toDetails(): Record<string, unknown> {
    return {
      errorCode: this.errorCode,
      errorMessage: this.errorMessage,
    };
  }
}
