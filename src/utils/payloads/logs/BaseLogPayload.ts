import { BLEOpcode } from '../../bleConstants';

export abstract class BaseLogPayload {
  opcode: number;
  payload: Uint8Array;
  raw: Uint8Array;
  timestamp: string;
  age: number;

  constructor(opcode: number, payload: Uint8Array, raw: Uint8Array) {
    this.opcode = opcode;
    this.payload = payload;
    this.raw = raw;
    const { timestamp, age } = this.parseTimestamp(payload);
    this.timestamp = timestamp;
    this.age = age;
  }

  protected parseTimestamp(payload: Uint8Array): { timestamp: string; age: number } {
    if (payload.length < 3) {
      return { timestamp: new Date().toISOString(), age: 0 };
    }
    // Age in seconds (3 bytes)
    const age = (payload[0] << 16) | (payload[1] << 8) | payload[2];
    const date = new Date(Date.now() - age * 1000);
    return { timestamp: date.toISOString(), age };
  }

  abstract get description(): string;

  toDetails(): Record<string, unknown> {
    return {
      age: this.age,
      opcode: this.opcode,
    };
  }
}
