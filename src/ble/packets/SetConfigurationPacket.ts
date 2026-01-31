import { BoksTXPacket } from './BoksTXPacket';
import { BLEOpcode } from '../../utils/bleConstants';

export class SetConfigurationPacket extends BoksTXPacket {
  readonly opcode = BLEOpcode.SET_CONFIGURATION;

  constructor(
    private configKey: string,
    private configType: number,
    private value: number
  ) {
    super();
  }

  toPayload(): Uint8Array {
    return new Uint8Array([
      ...this.stringToBytes(this.configKey),
      this.configType,
      this.value,
    ]);
  }
}