import { BoksTXPacket } from './BoksTXPacket';
import { BLEOpcode } from '../../utils/bleConstants';

export class SetConfigurationPacket extends BoksTXPacket {
  readonly opcode = BLEOpcode.SET_CONFIGURATION;

  constructor(
    public configKey: string = '',
    public configType: number = 0,
    public configValue: number = 0
  ) {
    super();
  }

  toPayload(configKey?: string): Uint8Array {
    const key = configKey ?? this.configKey;
    if (!key) {
      throw new Error("SetConfigurationPacket: configKey is required");
    }
    return new Uint8Array([
      ...this.stringToBytes(key),
      this.configType,
      this.configValue,
    ]);
  }

  parse(payload: Uint8Array): void {
    if (payload.length < 2) return;
    const keyLen = payload.length - 2;
    const keyBytes = payload.subarray(0, keyLen);
    this.configKey = String.fromCharCode(...keyBytes);
    this.configType = payload[keyLen];
    this.configValue = payload[keyLen + 1];
  }
}
