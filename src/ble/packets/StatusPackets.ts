import { BoksTXPacket } from './BoksTXPacket';
import { BLEOpcode } from '../../utils/bleConstants';
import { z } from 'zod';

export class AskDoorStatusPacket extends BoksTXPacket {
  static get opcode() {
    return BLEOpcode.ASK_DOOR_STATUS;
  }

  static schema = z.object({});

  toPayload(): Uint8Array {
    return new Uint8Array(0);
  }

  parse(): void {
    // No payload
  }
}

export class TestBatteryPacket extends BoksTXPacket {
  static get opcode() {
    return BLEOpcode.TEST_BATTERY;
  }

  static schema = z.object({});

  toPayload(): Uint8Array {
    return new Uint8Array(0);
  }

  parse(): void {
    // No payload
  }
}

export class CountCodesPacket extends BoksTXPacket {
  static get opcode() {
    return BLEOpcode.COUNT_CODES;
  }

  static schema = z.object({});

  toPayload(): Uint8Array {
    return new Uint8Array(0);
  }

  parse(): void {
    // No payload
  }
}
