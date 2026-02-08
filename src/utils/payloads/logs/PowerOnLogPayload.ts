import { BaseLogPayload } from './BaseLogPayload';

export class PowerOnLogPayload extends BaseLogPayload {
  get description(): string {
    return 'logs:events.power_on';
  }
}
