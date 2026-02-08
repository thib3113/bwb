// Codes count payload
import { ParsedPayload } from './base';

export class CodesCountPayload implements ParsedPayload {
  opcode: number;
  payload: Uint8Array;
  raw: Uint8Array;
  master: number;
  single: number;

  constructor(opcode: number, payload: Uint8Array, raw: Uint8Array) {
    this.opcode = opcode;
    this.payload = payload;
    this.raw = raw;

    // Based on _BoksDevice.js: payload.readUInt16BE(0) and readUInt16BE(2)
    if (payload.length >= 4) {
      this.master = (payload[0] << 8) | payload[1];
      this.single = (payload[2] << 8) | payload[3];
    } else {
      this.master = 0;
      this.single = 0;
    }
  }

  toString(): string {
    return `Codes Count - Master: ${this.master}, Single: ${this.single}`;
  }

  toDetails(): Record<string, unknown> {
    return {
      master: this.master,
      single: this.single,
    };
  }
}
