import { BoksTXPacket } from './BoksTXPacket';
import { BLEOpcode } from '../../utils/bleConstants';

export class GenerateCodesPacket extends BoksTXPacket {
  readonly opcode = BLEOpcode.GENERATE_CODES;

  toPayload(): Uint8Array {
    return new Uint8Array(0);
  }
}

export class GenerateCodesSupportPacket extends BoksTXPacket {
  readonly opcode = BLEOpcode.GENERATE_CODES_SUPPORT;

  toPayload(): Uint8Array {
    return new Uint8Array(0);
  }
}

export class RebootPacket extends BoksTXPacket {
  readonly opcode = BLEOpcode.REBOOT;

  toPayload(): Uint8Array {
    return new Uint8Array(0);
  }
}
