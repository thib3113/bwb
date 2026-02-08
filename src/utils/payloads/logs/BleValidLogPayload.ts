import { BaseCodeLogPayload } from './BaseCodeLogPayload';

export class BleValidLogPayload extends BaseCodeLogPayload {
  get description(): string {
    return 'logs:events.ble_valid';
  }
}
