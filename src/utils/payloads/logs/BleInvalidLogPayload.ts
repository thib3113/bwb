import { BLEOpcode } from '../../bleConstants';
import { BaseCodeLogPayload } from './BaseCodeLogPayload';

export class BleInvalidLogPayload extends BaseCodeLogPayload {
  static OPCODES = [BLEOpcode.LOG_CODE_BLE_INVALID_HISTORY];
  get description(): string {
    return 'logs:events.ble_invalid';
  }
}
