// Code history payload (Logs)
import { ParsedPayload } from './base';
import { BLEOpcode } from '../bleConstants';

export class CodeHistoryPayload implements ParsedPayload {
  opcode: number;
  payload: Uint8Array;
  raw: Uint8Array;
  age: number; // Seconds elapsed since event
  timestamp: number; // Estimated Unix timestamp
  code?: string;
  macAddress?: string;
  reason_code?: number;
  error_subtype?: number;
  error_code?: number;
  error_internal_code?: number;

  constructor(opcode: number, payload: Uint8Array, raw: Uint8Array) {
    this.opcode = opcode;
    this.payload = payload;
    this.raw = raw;

    // Based on Python: first 3 bytes are Age (Big Endian)
    if (payload.length >= 3) {
      this.age = (payload[0] << 16) | (payload[1] << 8) | payload[2];
      this.timestamp = Math.floor(Date.now() / 1000) - this.age;
    } else {
      this.age = 0;
      this.timestamp = Math.floor(Date.now() / 1000);
    }

    const specificPayload = payload.slice(3);

    // Parsing specific opcodes
    if (
      [
        BLEOpcode.LOG_CODE_BLE_VALID_HISTORY,
        BLEOpcode.LOG_CODE_KEY_VALID_HISTORY,
        BLEOpcode.LOG_CODE_BLE_INVALID_HISTORY,
        BLEOpcode.LOG_CODE_KEY_INVALID_HISTORY,
      ].includes(opcode) &&
      specificPayload.length >= 6
    ) {
      this.code = new TextDecoder().decode(specificPayload.slice(0, 6)).replace(/\0/g, '');

      // MAC address for BLE opcodes (usually after code + 2 bytes padding/offset?)
      // Python says if len >= 15 (total), so specific len >= 12
      if (
        [BLEOpcode.LOG_CODE_BLE_VALID_HISTORY, BLEOpcode.LOG_CODE_BLE_INVALID_HISTORY].includes(
          opcode
        ) &&
        specificPayload.length >= 12
      ) {
        // Logic might vary, Python doesn't explicitly parse MAC in some versions but here we try
        // If payload[9:15] is MAC
        const macBytes = specificPayload.slice(6, 12); // Assuming it follows immediately if no padding
        this.macAddress = Array.from(macBytes)
          .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
          .join(':');
      }
    } else if (opcode === BLEOpcode.POWER_OFF && specificPayload.length >= 1) {
      this.reason_code = specificPayload[0];
    } else if (opcode === BLEOpcode.LOG_EVENT_ERROR && specificPayload.length >= 3) {
      this.error_subtype = specificPayload[0];
      this.error_code = specificPayload[1];
      this.error_internal_code = specificPayload[2];
    }
  }

  toString(): string {
    const parts = [`Age: ${this.age}s`];
    if (this.code) parts.push(`Code: ${this.code}`);
    if (this.macAddress) parts.push(`MAC: ${this.macAddress}`);
    if (this.reason_code !== undefined) parts.push(`Reason: ${this.reason_code}`);
    return `Log 0x${this.opcode.toString(16)} (${parts.join(', ')})`;
  }

  toDetails(): Record<string, unknown> {
    const details: Record<string, unknown> = {
      age: this.age,
      timestamp: this.timestamp,
    };

    if (this.code) details.code = this.code;
    if (this.macAddress) details.macAddress = this.macAddress;
    if (this.reason_code !== undefined) details.reason_code = this.reason_code;
    if (this.error_code !== undefined) {
      details.error_subtype = this.error_subtype;
      details.error_code = this.error_code;
      details.error_internal_code = this.error_internal_code;
    }

    return details;
  }
}
