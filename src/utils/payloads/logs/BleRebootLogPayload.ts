import { BaseLogPayload } from './BaseLogPayload';

export class BleRebootLogPayload extends BaseLogPayload {
  get description(): string {
    return 'logs:events.ble_reboot';
  }
}
