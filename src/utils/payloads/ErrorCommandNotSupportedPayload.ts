import { BaseErrorPayload } from './BaseErrorPayload';

export class ErrorCommandNotSupportedPayload extends BaseErrorPayload {
  get errorMessage() {
    return 'Command Not Supported';
  }
}
