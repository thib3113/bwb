// Logs count payload
import { ParsedPayload } from './base';

export class LogsCountPayload implements ParsedPayload {
  opcode: number;
  payload: Uint8Array;
  raw: Uint8Array;
  count: number;

  constructor(opcode: number, payload: Uint8Array, raw: Uint8Array) {
    this.opcode = opcode;
    this.payload = payload;
    this.raw = raw;

    // Based on example: NOTIFY_LOGS_COUNT (0x79): [0x79, 0x02, 0x00, 0x17, 0x92]
    // Payload is 2 bytes (uint16, big endian)
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
