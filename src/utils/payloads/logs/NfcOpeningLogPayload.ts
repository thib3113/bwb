import { BLEOpcode } from '../../bleConstants';
import { BaseNfcLogPayload } from './BaseNfcLogPayload';

export class NfcOpeningLogPayload extends BaseNfcLogPayload {
  static OPCODES = [BLEOpcode.LOG_EVENT_NFC_OPENING];
  get description(): string {
    return 'logs:events.nfc_opening';
  }
}
