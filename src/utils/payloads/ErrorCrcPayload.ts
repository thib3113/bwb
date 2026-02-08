import { BaseErrorPayload } from './BaseErrorPayload';

export class ErrorCrcPayload extends BaseErrorPayload {
  get errorMessage() {
    return 'CRC Error';
  }
}
