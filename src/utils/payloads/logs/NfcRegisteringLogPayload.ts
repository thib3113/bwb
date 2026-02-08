import { BaseNfcLogPayload } from './BaseNfcLogPayload';

export class NfcRegisteringLogPayload extends BaseNfcLogPayload {
  get description(): string {
    return 'logs:events.nfc_registering';
  }
}
