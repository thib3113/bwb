import { ParsedPayload } from '../base';

export abstract class BaseLogPayload implements ParsedPayload {
  opcode: number;
  payload: Uint8Array;
  raw: Uint8Array;
  age: number;
  timestamp: number;

  constructor(opcode: number, payload: Uint8Array, raw: Uint8Array) {
    this.opcode = opcode;
    this.payload = payload;
    this.raw = raw;

    if (payload.length >= 3) {
      this.age = (payload[0] << 16) | (payload[1] << 8) | payload[2];
      this.timestamp = Math.floor(Date.now() / 1000) - this.age;
    } else {
      this.age = 0;
      this.timestamp = Math.floor(Date.now() / 1000);
    }
  }

  abstract toString(): string;

  toDetails(): Record<string, unknown> {
    return {
      age: this.age,
      timestamp: this.timestamp,
    };
  }
}
