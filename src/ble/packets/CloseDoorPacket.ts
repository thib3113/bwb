import { BoksTXPacket } from './BoksTXPacket';
import { BLEOpcode } from '../../utils/bleConstants';

export class CloseDoorPacket extends BoksTXPacket {
  readonly opcode = BLEOpcode.CLOSE_DOOR;

  toPayload(): Uint8Array {
    return new Uint8Array(0);
  }
}
