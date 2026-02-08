import { BaseLogPayload } from './BaseLogPayload';

export class DoorCloseLogPayload extends BaseLogPayload {
  get description(): string {
    return 'logs:events.door_close';
  }
}
