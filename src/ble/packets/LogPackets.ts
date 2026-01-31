import { BoksTXPacket } from './BoksTXPacket';
import { BLEOpcode } from '../../utils/bleConstants';

export class RequestLogsPacket extends BoksTXPacket {
  readonly opcode = BLEOpcode.REQUEST_LOGS;

  toPayload(configKey?: string): Uint8Array {
    return new Uint8Array(0);
  }

  parse(payload: Uint8Array): void {
    // No payload
  }
}

export class GetLogsCountPacket extends BoksTXPacket {
  readonly opcode = BLEOpcode.GET_LOGS_COUNT;

  toPayload(configKey?: string): Uint8Array {
    return new Uint8Array(0);
  }

  parse(payload: Uint8Array): void {
    // No payload
  }
}
