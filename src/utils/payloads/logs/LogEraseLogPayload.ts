import { BaseLogPayload } from './BaseLogPayload';

export class LogEraseLogPayload extends BaseLogPayload {
  get description(): string {
    return 'logs:events.log_erase';
  }
}
