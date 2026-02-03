import { BoksRXPacket } from './BoksRXPacket';
import { BLEOpcode } from '../../../utils/bleConstants';

export class DoorStatusPacket extends BoksRXPacket {
  static get opcode_push() {
    return BLEOpcode.NOTIFY_DOOR_STATUS;
  }
  static get opcode_pull() {
    return BLEOpcode.ANSWER_DOOR_STATUS;
  }

  public isOpen: boolean = false;

  constructor(opcode: number) {
    super(opcode);
  }

  parse(payload: Uint8Array): void {
    if (payload.length > 0) {
      // 0x01 = Open, 0x00 = Closed
      this.isOpen = payload[0] === 0x01;
    }
  }
}
