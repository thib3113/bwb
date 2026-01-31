// Battery payload
import { ParsedPayload } from './base';
import { BATTERY_INVALID_VALUE } from '../bleConstants';

export class BatteryPayload implements ParsedPayload {
  opcode: number;
  payload: Uint8Array;
  raw: Uint8Array;
  level_last?: number;
  temperature?: number;
  format: string;

  constructor(opcode: number, payload: Uint8Array, raw: Uint8Array) {
    this.opcode = opcode;
    this.payload = payload;
    this.raw = raw;

    // Match Python's parse_battery_stats
    if (payload.length === 6) {
      this.format = 'measures-first-min-mean-max-last';
      this.level_last = payload[4];
      this.temperature = payload[5] !== BATTERY_INVALID_VALUE ? payload[5] - 25 : undefined;
    } else if (payload.length === 4) {
      this.format = 'measures-t1-t5-t10';
      this.level_last = payload[0]; // level_t1
      this.temperature = payload[3] !== BATTERY_INVALID_VALUE ? payload[3] - 25 : undefined;
    } else if (payload.length === 1) {
      this.format = 'single-level';
      this.level_last = payload[0];
    } else {
      this.format = 'unknown';
      this.level_last = payload.length > 0 ? payload[0] : undefined;
    }
  }

  toString(): string {
    return `Battery: ${this.level_last}%${this.temperature !== undefined ? `, Temp: ${this.temperature}°C` : ''}`;
  }

  toDetails(): Record<string, unknown> {
    return {
      level: this.level_last,
      temperature: this.temperature,
      format: this.format,
    };
  }
}
