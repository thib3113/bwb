import { BaseLogPayload } from './BaseLogPayload';

export abstract class BaseNfcLogPayload extends BaseLogPayload {
  tag_type: number;
  tag_uid: string;

  constructor(opcode: number, payload: Uint8Array, raw: Uint8Array) {
    super(opcode, payload, raw);
    const specificPayload = payload.slice(3);

    if (specificPayload.length >= 2) {
      this.tag_type = specificPayload[0];
      const uidLen = specificPayload[1];
      if (specificPayload.length >= 2 + uidLen) {
        const uidBytes = specificPayload.subarray(2, 2 + uidLen);
        this.tag_uid = Array.from(uidBytes)
          .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
          .join(':');
      } else {
        this.tag_uid = '';
      }
    } else {
      this.tag_type = 0;
      this.tag_uid = '';
    }
  }

  toDetails(): Record<string, unknown> {
    const details = super.toDetails();
    details.tag_uid = this.tag_uid;
    details.tag_type = this.tag_type;
    return details;
  }
}
