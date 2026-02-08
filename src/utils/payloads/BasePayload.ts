export abstract class BasePayload {
  opcode: number;
  payload: Uint8Array;
  raw: Uint8Array;

  constructor(opcode: number, payload: Uint8Array, raw: Uint8Array) {
    this.opcode = opcode;
    this.payload = payload;
    this.raw = raw;
  }
}
