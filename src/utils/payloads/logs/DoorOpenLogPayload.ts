import { BaseLogPayload } from './BaseLogPayload';

export class DoorOpenLogPayload extends BaseLogPayload {
  get description(): string {
    return 'logs:events.door_open';
  }
}
