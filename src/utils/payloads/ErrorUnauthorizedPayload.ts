import { BaseErrorPayload } from './BaseErrorPayload';

export class ErrorUnauthorizedPayload extends BaseErrorPayload {
  get errorMessage() {
    return 'Unauthorized';
  }
}
