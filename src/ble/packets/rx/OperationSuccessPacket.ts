import {BoksRXPacket} from './BoksRXPacket';
import {BLEOpcode} from '../../../utils/bleConstants';

export class OperationSuccessPacket extends BoksRXPacket {
  static readonly opcode = BLEOpcode.CODE_OPERATION_SUCCESS;

  constructor() {
    super(OperationSuccessPacket.opcode);
  }

  parse(): void {
    // No payload to parse for simple success
  }
}
