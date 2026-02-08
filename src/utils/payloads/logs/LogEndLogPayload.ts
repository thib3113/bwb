import { BaseLogPayload } from './BaseLogPayload';

export class LogEndLogPayload extends BaseLogPayload {
  get description(): string {
    return 'logs:events.log_end';
  }
}
