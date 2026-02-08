import { BLEOpcode } from '../../bleConstants';
import { BaseNfcLogPayload } from './BaseNfcLogPayload';

export class NfcRegisteringLogPayload extends BaseNfcLogPayload {
  static OPCODES = [BLEOpcode.LOG_EVENT_NFC_REGISTERING];
  get description(): string {
    return 'logs:events.nfc_registering';
  }
}
