import { BaseLogPayload } from './BaseLogPayload';

export class BlockResetLogPayload extends BaseLogPayload {
  get description(): string {
    return 'logs:events.block_reset';
  }
}
