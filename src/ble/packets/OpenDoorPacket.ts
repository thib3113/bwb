import { BoksTXPacket } from './BoksTXPacket';
import { BLEOpcode } from '../../utils/bleConstants';

export class OpenDoorPacket extends BoksTXPacket {
  readonly opcode = BLEOpcode.OPEN_DOOR;

  constructor(private pinCode: string) {
    super();
  }

  toPayload(): Uint8Array {
    return new Uint8Array(this.stringToBytes(this.pinCode));
  }
}