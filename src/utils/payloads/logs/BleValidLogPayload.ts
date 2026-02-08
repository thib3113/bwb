import { BLEOpcode } from '../../bleConstants';
import { BaseCodeLogPayload } from './BaseCodeLogPayload';

export class BleValidLogPayload extends BaseCodeLogPayload {
  static OPCODES = [BLEOpcode.LOG_CODE_BLE_VALID_HISTORY];
  get description(): string {
    return 'logs:events.ble_valid';
  }
}
