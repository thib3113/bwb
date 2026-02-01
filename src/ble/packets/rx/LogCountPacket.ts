import { BoksRXPacket } from './BoksRXPacket';
import { BLEOpcode } from '../../../utils/bleConstants';

export class LogCountPacket extends BoksRXPacket {
  static readonly opcode = BLEOpcode.NOTIFY_LOGS_COUNT;

  public count: number = 0;

  constructor() {
    super(LogCountPacket.opcode);
  }

  parse(payload: Uint8Array): void {
    if (payload.length >= 2) {
      const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
      this.count = view.getUint16(0, true); // Little Endian
    } else if (payload.length === 1) {
      this.count = payload[0];
    }
  }
}
