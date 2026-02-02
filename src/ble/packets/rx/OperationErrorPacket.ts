import { BoksRXPacket } from './BoksRXPacket';
import { BLEOpcode } from '../../../utils/bleConstants';

export class OperationErrorPacket extends BoksRXPacket {
  static get opcode() {
    return BLEOpcode.CODE_OPERATION_ERROR;
  }

  constructor() {
    super(OperationErrorPacket.opcode);
  }

  parse(): void {
    // Usually empty, or specific error codes if documented
  }
}
