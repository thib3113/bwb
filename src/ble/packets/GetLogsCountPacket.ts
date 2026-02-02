import { BoksTXPacket } from './BoksTXPacket';
import { BLEOpcode } from '../../utils/bleConstants';
import { z } from 'zod';

export class GetLogsCountPacket extends BoksTXPacket {
  readonly opcode = BLEOpcode.GET_LOGS_COUNT;

  static schema = z.object({});

  toPayload(): Uint8Array {
    return new Uint8Array(0);
  }

  parse(): void {
    // No payload
  }
}
