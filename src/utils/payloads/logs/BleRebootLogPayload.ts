import { BLEOpcode } from '../../bleConstants';
import { BaseLogPayload } from './BaseLogPayload';

export class BleRebootLogPayload extends BaseLogPayload {
  static OPCODES = [BLEOpcode.BLE_REBOOT];
  get description(): string {
    return 'logs:events.ble_reboot';
  }
}
