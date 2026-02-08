import { BLEOpcode } from '../../bleConstants';
import { BaseLogPayload } from './BaseLogPayload';

export class DoorOpenLogPayload extends BaseLogPayload {
  static OPCODES = [BLEOpcode.LOG_DOOR_OPEN_HISTORY];
  get description(): string {
    return 'logs:events.door_open';
  }
}
