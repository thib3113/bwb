import { BoksRXPacket } from './BoksRXPacket';
import { BLEOpcode } from '../../../utils/bleConstants';

export enum NfcScanResultStatus {
  FOUND = 'found',
  ALREADY_EXISTS = 'already_exists',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown'
}

export class NfcScanResultPacket extends BoksRXPacket {
  static get opcodes() {
    return [
      BLEOpcode.NOTIFY_NFC_TAG_REGISTER_SCAN_RESULT,
      BLEOpcode.NOTIFY_NFC_TAG_REGISTER_SCAN_ERROR_EXISTS,
      BLEOpcode.NOTIFY_NFC_TAG_REGISTER_SCAN_TIMEOUT
    ];
  }

  public uid: string | null = null;

  constructor(opcode: number) {
    super(opcode);
  }

  get status(): NfcScanResultStatus {
    if (this.opcode === BLEOpcode.NOTIFY_NFC_TAG_REGISTER_SCAN_RESULT)
      return NfcScanResultStatus.FOUND;
    if (this.opcode === BLEOpcode.NOTIFY_NFC_TAG_REGISTER_SCAN_ERROR_EXISTS)
      return NfcScanResultStatus.ALREADY_EXISTS;
    if (this.opcode === BLEOpcode.NOTIFY_NFC_TAG_REGISTER_SCAN_TIMEOUT)
      return NfcScanResultStatus.TIMEOUT;
    return NfcScanResultStatus.UNKNOWN;
  }

  parse(payload: Uint8Array): void {
    if (
      this.opcode === BLEOpcode.NOTIFY_NFC_TAG_REGISTER_SCAN_RESULT ||
      this.opcode === BLEOpcode.NOTIFY_NFC_TAG_REGISTER_SCAN_ERROR_EXISTS
    ) {
      // Payload for 0xC5/0xC6: [UID_Len(1)] [UID(NB)]
      const uidLen = payload[0];
      if (uidLen > 0 && payload.length >= 1 + uidLen) {
        const uidBytes = payload.subarray(1, 1 + uidLen);
        this.uid = Array.from(uidBytes)
          .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
          .join(':');
      }
    }
    // 0xC7 has empty payload
  }
}
