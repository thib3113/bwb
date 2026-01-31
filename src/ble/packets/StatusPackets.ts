import { BoksTXPacket } from './BoksTXPacket';
import { BLEOpcode } from '../../utils/bleConstants';

export class AskDoorStatusPacket extends BoksTXPacket {
  readonly opcode = BLEOpcode.ASK_DOOR_STATUS;

  toPayload(): Uint8Array {
    return new Uint8Array(0);
  }
}

export class TestBatteryPacket extends BoksTXPacket {
  readonly opcode = BLEOpcode.TEST_BATTERY;

  toPayload(): Uint8Array {
    return new Uint8Array(0);
  }
}

export class CountCodesPacket extends BoksTXPacket {
  readonly opcode = BLEOpcode.COUNT_CODES;

  toPayload(): Uint8Array {
    return new Uint8Array(0);
  }
}
