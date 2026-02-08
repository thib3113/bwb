import { BaseCodeLogPayload } from './BaseCodeLogPayload';

export class KeyInvalidLogPayload extends BaseCodeLogPayload {
  get description(): string {
    return 'logs:events.key_invalid';
  }
}
