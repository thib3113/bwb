import {BoksTXPacket} from './BoksTXPacket';
import {BLEOpcode} from '../../utils/bleConstants';

export class RequestLogsPacket extends BoksTXPacket {
  readonly opcode = BLEOpcode.REQUEST_LOGS;

  toPayload(): Uint8Array {
    return new Uint8Array(0);
  }

  parse(): void {
    // No payload
  }
}
