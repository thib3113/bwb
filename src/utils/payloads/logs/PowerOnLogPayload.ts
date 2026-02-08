import { BLEOpcode } from '../../bleConstants';
import { BaseLogPayload } from './BaseLogPayload';

export class PowerOnLogPayload extends BaseLogPayload {
  static OPCODES = [BLEOpcode.POWER_ON];
  get description(): string {
    return 'logs:events.power_on';
  }
}
