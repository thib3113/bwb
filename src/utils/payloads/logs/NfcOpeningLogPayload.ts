import { BaseNfcLogPayload } from './BaseNfcLogPayload';

export class NfcOpeningLogPayload extends BaseNfcLogPayload {
  get description(): string {
    return 'logs:events.nfc_opening';
  }
}
