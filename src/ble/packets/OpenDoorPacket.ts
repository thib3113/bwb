import { BoksTXPacket } from './BoksTXPacket';
import { BLEOpcode } from '../../utils/bleConstants';
import { z } from 'zod';

export class OpenDoorPacket extends BoksTXPacket {
  static get opcode() {
    return BLEOpcode.OPEN_DOOR;
  }

  static schema = z.object({
    pinCode: z.string().min(1, 'PIN Code is required')
  });

  constructor(public pinCode: string = '') {
    super();
  }

  toPayload(): Uint8Array {
    if (!this.pinCode) {
      throw new Error('OpenDoorPacket: pinCode is required');
    }
    return new Uint8Array(this.stringToBytes(this.pinCode));
  }

  parse(payload: Uint8Array): void {
    this.pinCode = new TextDecoder().decode(payload);
  }
}
