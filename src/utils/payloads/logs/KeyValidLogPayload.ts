import { BLEOpcode } from '../../bleConstants';
import { BaseCodeLogPayload } from './BaseCodeLogPayload';

export class KeyValidLogPayload extends BaseCodeLogPayload {
  static OPCODES = [BLEOpcode.LOG_CODE_KEY_VALID_HISTORY];
  get description(): string {
    return 'logs:events.key_valid';
  }
}
