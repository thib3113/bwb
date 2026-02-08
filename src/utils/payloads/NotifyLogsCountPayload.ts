import { ParsedPayload } from './base';

export class NotifyLogsCountPayload implements ParsedPayload {
  opcode: number;
  payload: Uint8Array;
  raw: Uint8Array;
  count: number;

  constructor(opcode: number, payload: Uint8Array, raw: Uint8Array) {
    this.opcode = opcode;
    this.payload = payload;
    this.raw = raw;

    if (payload.length >= 2) {
      this.count = (payload[0] << 8) | payload[1];
    } else {
      this.count = 0;
    }
  }

  toString(): string {
    return `Logs Count: ${this.count}`;
  }

  toDetails(): Record<string, unknown> {
    return {
      count: this.count,
    };
  }
}
