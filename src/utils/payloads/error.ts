// Error payload
import { ParsedPayload } from './base';
import { BLEOpcode } from '../bleConstants';

export class ErrorPayload implements ParsedPayload {
  opcode: number;
  payload: Uint8Array;
  raw: Uint8Array;
  errorCode: number;
  errorMessage: string;

  constructor(opcode: number, payload: Uint8Array, raw: Uint8Array) {
    this.opcode = opcode;
    this.payload = payload;
    this.raw = raw;

    // Error code is typically in the payload
    if (payload.length >= 1) {
      this.errorCode = payload[0];
    } else {
      this.errorCode = 0;
    }

    // Map error codes to messages
    const errorMessages: Record<number, string> = {
      [BLEOpcode.ERROR_CRC]: 'CRC Error',
      [BLEOpcode.ERROR_UNAUTHORIZED]: 'Unauthorized',
      [BLEOpcode.ERROR_BAD_REQUEST]: 'Bad Request',
      [BLEOpcode.ERROR_COMMAND_NOT_SUPPORTED]: 'Command Not Supported',
    };

    this.errorMessage = errorMessages[opcode] || `Unknown Error (${this.errorCode})`;
  }

  toString(): string {
    return `Error: ${this.errorMessage} (${this.errorCode})`;
  }

  toDetails(): Record<string, unknown> {
    return {
      errorCode: this.errorCode,
      errorMessage: this.errorMessage,
    };
  }
}
