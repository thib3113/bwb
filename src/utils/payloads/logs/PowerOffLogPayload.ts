import { BaseLogPayload } from './BaseLogPayload';
import { BLEOpcode, POWER_OFF_REASONS } from '../../bleConstants';

export class PowerOffLogPayload extends BaseLogPayload {
  static OPCODES = [BLEOpcode.POWER_OFF];
  reason: string;

  constructor(opcode: number, payload: Uint8Array, raw: Uint8Array) {
    super(opcode, payload, raw);
    const specificPayload = payload.slice(3);
    const reasonCode = specificPayload[0] || 0;
    this.reason = POWER_OFF_REASONS[reasonCode] || 'unknown';
  }

  get description(): string {
    return 'logs:events.power_off';
  }

  toDetails(): Record<string, unknown> {
    return {
      ...super.toDetails(),
      reason: this.reason
    };
  }
}
