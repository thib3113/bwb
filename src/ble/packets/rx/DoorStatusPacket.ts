import { BoksRXPacket } from './BoksRXPacket';
import { BLEOpcode } from '../../../utils/bleConstants';

export class DoorStatusPacket extends BoksRXPacket {
  static readonly opcode_push = BLEOpcode.NOTIFY_DOOR_STATUS;
  static readonly opcode_pull = BLEOpcode.ANSWER_DOOR_STATUS;

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
