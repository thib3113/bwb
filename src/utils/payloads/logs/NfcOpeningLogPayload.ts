import { BaseNfcLogPayload } from './BaseNfcLogPayload';

export class NfcOpeningLogPayload extends BaseNfcLogPayload {
  toString(): string {
    return `NFC Opening Log (Age: ${this.age}s, UID: ${this.tag_uid}, Type: ${this.tag_type})`;
  }
}
