import { BoksTXPacket } from './BoksTXPacket';
import { BLEOpcode } from '../../utils/bleConstants';
import { z } from 'zod';

export class RequestLogsPacket extends BoksTXPacket {
  readonly opcode = BLEOpcode.REQUEST_LOGS;

  static schema = z.object({});

  toPayload(): Uint8Array {
    return new Uint8Array(0);
  }

  parse(): void {
    // No payload
  }
}
