import {BoksTXPacket} from './BoksTXPacket';
import {BLEOpcode} from '../../utils/bleConstants';

export class NfcUnregisterPacket extends BoksTXPacket {
  readonly opcode = BLEOpcode.UNREGISTER_NFC_TAG;

  constructor(
    public configKey: string = '',
    public uidBytes: Uint8Array = new Uint8Array(0)
  ) {
    super();
  }

  toPayload(configKey?: string): Uint8Array {
    const key = configKey ?? this.configKey;
    if (!key) throw new Error('NfcUnregisterPacket: configKey is required');
    if (!this.uidBytes || this.uidBytes.length === 0)
      throw new Error('NfcUnregisterPacket: uidBytes is required');

    const keyBytes = this.stringToBytes(key);
    // Payload: Key + UID_LEN + UID
    const payload = new Uint8Array(keyBytes.length + 1 + this.uidBytes.length);
    payload.set(keyBytes, 0);
    payload[keyBytes.length] = this.uidBytes.length;
    payload.set(this.uidBytes, keyBytes.length + 1);
    return payload;
  }

  parse(payload: Uint8Array): void {
    const KEY_LEN = 8;
    if (payload.length < KEY_LEN + 1) return;
    this.configKey = String.fromCharCode(...payload.subarray(0, KEY_LEN));
    const uidLen = payload[KEY_LEN];
    if (payload.length < KEY_LEN + 1 + uidLen) return;
    this.uidBytes = payload.subarray(KEY_LEN + 1, KEY_LEN + 1 + uidLen);
  }
}
