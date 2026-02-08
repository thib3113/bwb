import { BLEOpcode } from '../../bleConstants';
import { BaseLogPayload } from './BaseLogPayload';

export class BlockResetLogPayload extends BaseLogPayload {
  static OPCODES = [BLEOpcode.BLOCK_RESET];
  get description(): string {
    return 'logs:events.block_reset';
  }
}
