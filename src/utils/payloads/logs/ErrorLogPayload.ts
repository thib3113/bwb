import { BaseLogPayload } from './BaseLogPayload';

export class ErrorLogPayload extends BaseLogPayload {
  error_subtype: number;
  error_code: number;
  error_internal_code: number;

  constructor(opcode: number, payload: Uint8Array, raw: Uint8Array) {
    super(opcode, payload, raw);
    const specificPayload = payload.slice(3);
    this.error_subtype = specificPayload[0] || 0;
    this.error_code = specificPayload[1] || 0;
    this.error_internal_code = specificPayload[2] || 0;
  }

  toString(): string {
    return `Error (Age: ${this.age}s, Code: ${this.error_code})`;
  }

  toDetails(): Record<string, unknown> {
    const details = super.toDetails();
    details.error_subtype = this.error_subtype;
    details.error_code = this.error_code;
    details.error_internal_code = this.error_internal_code;
    return details;
  }
}
