import { BaseLogPayload } from './BaseLogPayload';
import { DIAGNOSTIC_ERROR_CODES } from '../../bleConstants';

export class ErrorLogPayload extends BaseLogPayload {
  errorCode: string;

  constructor(opcode: number, payload: Uint8Array, raw: Uint8Array) {
    super(opcode, payload, raw);
    const specificPayload = payload.slice(3);
    const code = specificPayload[0] || 0;
    this.errorCode = DIAGNOSTIC_ERROR_CODES[code] || 'unknown_error';
  }

  get description(): string {
    return 'logs:events.error';
  }

  toDetails(): Record<string, unknown> {
    return {
      ...super.toDetails(),
      error: this.errorCode,
    };
  }
}
