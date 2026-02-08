import { BaseCodeLogPayload } from './BaseCodeLogPayload';

export class KeyValidLogPayload extends BaseCodeLogPayload {
  get description(): string {
    return 'logs:events.key_valid';
  }
}
