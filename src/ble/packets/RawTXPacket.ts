import { BoksTXPacket } from './BoksTXPacket';
import { z } from 'zod';

/**
 * A wrapper for raw opcode/payload pairs to allow them to be treated as proper Packet objects.
 * This is used for legacy calls or dynamic packet construction.
 */
export class RawTXPacket extends BoksTXPacket {
  static schema = z.object({
    opcode: z.number(),
    payload: z.any() // Uint8Array usually
  });

  constructor(
    private _opcode: number,
    private _payload: Uint8Array = new Uint8Array(0)
  ) {
    super();
  }

  get opcode(): number {
    return this._opcode;
  }

  toPayload(): Uint8Array {
    return this._payload;
  }

  parse(payload: Uint8Array): void {
    this._payload = payload;
  }
}
