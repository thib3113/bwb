import { BoksTXPacket } from './BoksTXPacket';
import { BLEOpcode } from '../../utils/bleConstants';

export class OpenDoorPacket extends BoksTXPacket {
  readonly opcode = BLEOpcode.OPEN_DOOR;

  constructor(public pinCode: string = '') {
    super();
  }

  toPayload(configKey?: string): Uint8Array {
    if (!this.pinCode) {
      throw new Error("OpenDoorPacket: pinCode is required");
    }
    return new Uint8Array(this.stringToBytes(this.pinCode));
  }

  parse(payload: Uint8Array): void {
    this.pinCode = new TextDecoder().decode(payload);
  }
}