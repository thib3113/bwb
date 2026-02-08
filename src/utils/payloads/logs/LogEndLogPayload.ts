import { BLEOpcode } from '../../bleConstants';
import { BaseLogPayload } from './BaseLogPayload';

export class LogEndLogPayload extends BaseLogPayload {
  static OPCODES = [BLEOpcode.LOG_END_HISTORY];
  get description(): string {
    return 'logs:events.log_end';
  }
}
