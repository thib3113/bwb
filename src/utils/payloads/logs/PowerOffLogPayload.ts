import { BaseLogPayload } from './BaseLogPayload';

export class PowerOffLogPayload extends BaseLogPayload {
  reason_code: number;

  constructor(opcode: number, payload: Uint8Array, raw: Uint8Array) {
    super(opcode, payload, raw);
    this.reason_code = payload.slice(3)[0] || 0;
  }

  toString(): string {
    return `Power Off (Age: ${this.age}s, Reason: ${this.reason_code})`;
  }

  toDetails(): Record<string, unknown> {
    const details = super.toDetails();
    details.reason_code = this.reason_code;
    return details;
  }
}
