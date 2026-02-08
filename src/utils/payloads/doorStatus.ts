// Door status payload
import { ParsedPayload } from './base';

export class DoorStatusPayload implements ParsedPayload {
  opcode: number;
  payload: Uint8Array;
  raw: Uint8Array;
  isOpen: boolean;
  isLocked: boolean;

  constructor(opcode: number, payload: Uint8Array, raw: Uint8Array) {
    this.opcode = opcode;
    this.payload = payload;
    this.raw = raw;

    // Based on Python and examples:
    // Opcode(1) + Len(1) + [Inverted, Live] + Checksum(1)
    // payload starts AFTER Len, so payload[0]=Inverted, payload[1]=Live
    if (payload.length >= 2) {
      const liveStatus = payload[1];
      this.isOpen = liveStatus === 1;
      this.isLocked = !this.isOpen;
    } else {
      this.isOpen = false;
      this.isLocked = false;
    }
  }

  toString(): string {
    return `Door Status: ${this.isOpen ? 'Open' : 'Closed'}`;
  }

  toDetails(): Record<string, unknown> {
    return {
      isOpen: this.isOpen,
      isLocked: this.isLocked,
    };
  }
}
