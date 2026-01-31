import { BoksTXPacket } from './BoksTXPacket';
import { BLEOpcode } from '../../utils/bleConstants';

export class RebootPacket extends BoksTXPacket {
  readonly opcode = BLEOpcode.REBOOT;

  toPayload(): Uint8Array {
    return new Uint8Array(0);
  }
}