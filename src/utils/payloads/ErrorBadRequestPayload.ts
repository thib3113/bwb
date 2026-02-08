import { BaseErrorPayload } from './BaseErrorPayload';

export class ErrorBadRequestPayload extends BaseErrorPayload {
  get errorMessage() {
    return 'Bad Request';
  }
}
