import { BLEOpcode } from '../../bleConstants';
import { BaseLogPayload } from './BaseLogPayload';

export class LogEraseLogPayload extends BaseLogPayload {
  static OPCODES = [BLEOpcode.LOG_HISTORY_ERASE];
  get description(): string {
    return 'logs:events.log_erase';
  }
}
