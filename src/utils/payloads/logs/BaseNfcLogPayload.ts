import { BaseLogPayload } from './BaseLogPayload';

export abstract class BaseNfcLogPayload extends BaseLogPayload {
  tagUid: string;
  tagType: number;

  constructor(opcode: number, payload: Uint8Array, raw: Uint8Array) {
    super(opcode, payload, raw);
    const specificPayload = payload.slice(3);
    if (specificPayload.length >= 5) {
      this.tagType = specificPayload[0];
      this.tagUid = Array.from(specificPayload.slice(1, 5))
        .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
        .join(':');
    } else {
      this.tagType = 0;
      this.tagUid = 'UNKNOWN';
    }
  }

  toDetails(): Record<string, unknown> {
    return {
      ...super.toDetails(),
      tag_uid: this.tagUid,
      tag_type: this.tagType,
    };
  }
}
