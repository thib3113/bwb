import {BoksTXPacket} from './BoksTXPacket';
import {BLEOpcode} from '../../utils/bleConstants';

export class NfcScanStartPacket extends BoksTXPacket {
  readonly opcode = BLEOpcode.REGISTER_NFC_TAG_SCAN_START;

  constructor(public configKey: string = '') {
    super();
  }

  toPayload(configKey?: string): Uint8Array {
    const key = configKey ?? this.configKey;
    if (!key) throw new Error('NfcScanStartPacket: configKey is required');
    return new Uint8Array([...this.stringToBytes(key)]);
  }

  parse(payload: Uint8Array): void {
    const KEY_LEN = 8;
    if (payload.length < KEY_LEN) return;
    this.configKey = String.fromCharCode(...payload.subarray(0, KEY_LEN));
  }
}
