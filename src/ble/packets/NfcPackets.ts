import { BoksTXPacket } from './BoksTXPacket';
import { BLEOpcode } from '../../utils/bleConstants';

export class NfcScanStartPacket extends BoksTXPacket {
  readonly opcode = BLEOpcode.REGISTER_NFC_TAG_SCAN_START;

  constructor(public configKey: string = '') {
    super();
  }

  toPayload(configKey?: string): Uint8Array {
    const key = configKey ?? this.configKey;
    if (!key) throw new Error("NfcScanStartPacket: configKey is required");
    return new Uint8Array([...this.stringToBytes(key)]);
  }

  parse(payload: Uint8Array): void {
    const KEY_LEN = 8;
    if (payload.length < KEY_LEN) return;
    this.configKey = String.fromCharCode(...payload.subarray(0, KEY_LEN));
  }
}

export class NfcRegisterPacket extends BoksTXPacket {
  readonly opcode = BLEOpcode.REGISTER_NFC_TAG;

  constructor(
    public configKey: string = '',
    public uidBytes: Uint8Array = new Uint8Array(0)
  ) {
    super();
  }

  toPayload(configKey?: string): Uint8Array {
    const key = configKey ?? this.configKey;
    if (!key) throw new Error("NfcRegisterPacket: configKey is required");
    if (!this.uidBytes || this.uidBytes.length === 0) throw new Error("NfcRegisterPacket: uidBytes is required");

    const keyBytes = this.stringToBytes(key);
    const payload = new Uint8Array(keyBytes.length + this.uidBytes.length);
    payload.set(keyBytes, 0);
    payload.set(this.uidBytes, keyBytes.length);
    return payload;
  }

  parse(payload: Uint8Array): void {
    const KEY_LEN = 8;
    if (payload.length < KEY_LEN) return;
    this.configKey = String.fromCharCode(...payload.subarray(0, KEY_LEN));
    this.uidBytes = payload.subarray(KEY_LEN);
  }
}

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
    if (!key) throw new Error("NfcUnregisterPacket: configKey is required");
    if (!this.uidBytes || this.uidBytes.length === 0) throw new Error("NfcUnregisterPacket: uidBytes is required");

    const keyBytes = this.stringToBytes(key);
    const payload = new Uint8Array(keyBytes.length + this.uidBytes.length);
    payload.set(keyBytes, 0);
    payload.set(this.uidBytes, keyBytes.length);
    return payload;
  }

  parse(payload: Uint8Array): void {
    const KEY_LEN = 8;
    if (payload.length < KEY_LEN) return;
    this.configKey = String.fromCharCode(...payload.subarray(0, KEY_LEN));
    this.uidBytes = payload.subarray(KEY_LEN);
  }
}
