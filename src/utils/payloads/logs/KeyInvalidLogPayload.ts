import { BLEOpcode } from '../../bleConstants';
import { BaseCodeLogPayload } from './BaseCodeLogPayload';

export class KeyInvalidLogPayload extends BaseCodeLogPayload {
  static OPCODES = [BLEOpcode.LOG_CODE_KEY_INVALID_HISTORY];
  get description(): string {
    return 'logs:events.key_invalid';
  }
}
