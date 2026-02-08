import { BaseLogPayload } from './BaseLogPayload';

export class KeyOpeningLogPayload extends BaseLogPayload {
  get description(): string {
    return 'logs:events.key_opening';
  }
}
