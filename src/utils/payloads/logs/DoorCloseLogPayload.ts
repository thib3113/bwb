import { BLEOpcode } from '../../bleConstants';
import { BaseLogPayload } from './BaseLogPayload';

export class DoorCloseLogPayload extends BaseLogPayload {
  static OPCODES = [BLEOpcode.LOG_DOOR_CLOSE_HISTORY];
  get description(): string {
    return 'logs:events.door_close';
  }
}
