// Base interface and generic payload for BLE payload parsing

// Interface for parsed payload
export interface ParsedPayload {
  opcode: number;
  payload: Uint8Array;
  raw: Uint8Array;
  toString(): string;
  toDetails(): Record<string, unknown>;
}

// Generic payload class for unknown opcodes
export class GenericPayload implements ParsedPayload {
  opcode: number;
  payload: Uint8Array;
  raw: Uint8Array;

  constructor(opcode: number, payload: Uint8Array, raw: Uint8Array) {
    this.opcode = opcode;
    this.payload = payload;
    this.raw = raw;
  }

  toString(): string {
    return `Generic Payload: ${Array.from(this.payload)
      .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
      .join(' ')}`;
  }

  toDetails(): Record<string, unknown> {
    return {
      opcode: this.opcode,
      payload: Array.from(this.payload)
        .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
        .join(' '),
    };
  }
}
