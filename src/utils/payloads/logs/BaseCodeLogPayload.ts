import { BaseLogPayload } from './BaseLogPayload';
import { BLEOpcode } from '../../bleConstants';

export abstract class BaseCodeLogPayload extends BaseLogPayload {
  code: string;
  macAddress?: string;

  constructor(opcode: number, payload: Uint8Array, raw: Uint8Array) {
    super(opcode, payload, raw);
    const specificPayload = payload.slice(3);

    if (specificPayload.length >= 6) {
      this.code = new TextDecoder()
        .decode(specificPayload.slice(0, 6))
        .replace(/\0/g, '');

      if (
        (opcode === BLEOpcode.LOG_CODE_BLE_VALID ||
          opcode === BLEOpcode.LOG_CODE_BLE_INVALID) &&
        specificPayload.length >= 12
      ) {
        const macBytes = specificPayload.slice(6, 12);
        this.macAddress = Array.from(macBytes)
          .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
          .join(':');
      }
    } else {
      this.code = '';
    }
  }

  toDetails(): Record<string, unknown> {
    const details = super.toDetails();
    details.code = this.code;
    if (this.macAddress) {
      details.macAddress = this.macAddress;
    }
    return details;
  }
}
