import { BoksTXPacket } from './BoksTXPacket';
import { BLEOpcode } from '../../utils/bleConstants';

export class AskDoorStatusPacket extends BoksTXPacket {
  readonly opcode = BLEOpcode.ASK_DOOR_STATUS;

  toPayload(configKey?: string): Uint8Array {
    return new Uint8Array(0);
  }

  parse(payload: Uint8Array): void {
    // No payload
  }
}

export class TestBatteryPacket extends BoksTXPacket {
  readonly opcode = BLEOpcode.TEST_BATTERY;

  toPayload(configKey?: string): Uint8Array {
    return new Uint8Array(0);
  }

  parse(payload: Uint8Array): void {
    // No payload
  }
}

export class CountCodesPacket extends BoksTXPacket {
  readonly opcode = BLEOpcode.COUNT_CODES;

  toPayload(configKey?: string): Uint8Array {
    return new Uint8Array(0);
  }

  parse(payload: Uint8Array): void {
    // No payload
  }
}
