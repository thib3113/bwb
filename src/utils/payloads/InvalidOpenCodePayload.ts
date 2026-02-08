import { BLEOpcode } from '../bleConstants';
import { BasePayload } from './BasePayload';

export class InvalidOpenCodePayload extends BasePayload {
  static OPCODES = [BLEOpcode.INVALID_OPEN_CODE];
  // Can be extended with reason if protocol supports it
}
