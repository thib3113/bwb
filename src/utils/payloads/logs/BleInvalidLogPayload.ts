import { BaseCodeLogPayload } from './BaseCodeLogPayload';

export class BleInvalidLogPayload extends BaseCodeLogPayload {
  get description(): string {
    return 'logs:events.ble_invalid';
  }
}
