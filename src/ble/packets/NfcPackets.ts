import { BoksTXPacket } from './BoksTXPacket';
import { BLEOpcode } from '../../utils/bleConstants';

export class NfcScanStartPacket extends BoksTXPacket {
  readonly opcode = BLEOpcode.REGISTER_NFC_TAG_SCAN_START;

  constructor(private configKey: string) {
    super();
  }

  toPayload(): Uint8Array {
    return new Uint8Array([...this.stringToBytes(this.configKey)]);
  }
}

export class NfcRegisterPacket extends BoksTXPacket {
  readonly opcode = BLEOpcode.REGISTER_NFC_TAG;

  constructor(
    private configKey: string,
    private uidBytes: Uint8Array
  ) {
    super();
  }

  toPayload(): Uint8Array {
    const payload = new Uint8Array(this.configKey.length + this.uidBytes.length);
    payload.set(this.stringToBytes(this.configKey), 0);
    payload.set(this.uidBytes, this.configKey.length);
    return payload;
  }
}

export class NfcUnregisterPacket extends BoksTXPacket {
  readonly opcode = BLEOpcode.UNREGISTER_NFC_TAG;

  constructor(
    private configKey: string,
    private uidBytes: Uint8Array
  ) {
    super();
  }

  toPayload(): Uint8Array {
    const payload = new Uint8Array(this.configKey.length + this.uidBytes.length);
    payload.set(this.stringToBytes(this.configKey), 0);
    payload.set(this.uidBytes, this.configKey.length);
    return payload;
  }
}
