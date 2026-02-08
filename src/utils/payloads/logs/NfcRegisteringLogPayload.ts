import { BaseNfcLogPayload } from './BaseNfcLogPayload';

export class NfcRegisteringLogPayload extends BaseNfcLogPayload {
  toString(): string {
    return `NFC Registering Log (Age: ${this.age}s, UID: ${this.tag_uid}, Type: ${this.tag_type})`;
  }
}
