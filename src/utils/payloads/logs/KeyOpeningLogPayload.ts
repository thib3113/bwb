import { BLEOpcode } from '../../bleConstants';
import { BaseLogPayload } from './BaseLogPayload';

export class KeyOpeningLogPayload extends BaseLogPayload {
  static OPCODES = [BLEOpcode.LOG_EVENT_KEY_OPENING];
  get description(): string {
    return 'logs:events.key_opening';
  }
}
