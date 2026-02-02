import { BoksRXPacket } from './BoksRXPacket';
import { BLEOpcode } from '../../../utils/bleConstants';

export class DoorOpeningPacket extends BoksRXPacket {
  static readonly opcode = BLEOpcode.VALID_OPEN_CODE;

  constructor() {
    super(DoorOpeningPacket.opcode);
  }

  parse(): void {
    // Payload usually empty or contains user index
  }
}
