import { BoksTXPacket } from './BoksTXPacket';
import { BLEOpcode } from '../../utils/bleConstants';
import { z } from 'zod';
import { ParsedPayload } from '../../utils/payloads/base';

/**
 * A virtual packet used to represent internal GATT operations (Read/Write Char)
 * in the packet log stream. These are not real Boks Protocol packets sent over the wire,
 * but useful for debugging.
 */
export class GattOperationPacket extends BoksTXPacket implements ParsedPayload {
  // Required by ParsedPayload
  public payload: Uint8Array = new Uint8Array(0);
  public raw: Uint8Array = new Uint8Array(0);

  static get opcode() {
    return BLEOpcode.INTERNAL_GATT_OPERATION;
  }

  static schema = z.object({
    uuid: z.string(),
    description: z.string().optional(),
  });

  constructor(
    public uuid: string = '',
    public description: string = ''
  ) {
    super();
  }

  // ParsedPayload methods
  toString(): string {
    return this.description || `GATT Op: ${this.uuid}`;
  }

  toDetails(): Record<string, unknown> {
    return {
      uuid: this.uuid,
      description: this.description,
    };
  }

  toPayload(): Uint8Array {
    // We encode the UUID as the payload for logging purposes
    // Or we could encode "UUID|Description"
    // Since this is internal, we can decide the format.
    // Let's stick to the previous logic: UUID bytes.
    // "00002a28-..."

    // However, previously it was sending just the first 8 chars?
    // "uuidBytes = new TextEncoder().encode(charUuid.substring(0, 8));"

    if (!this.uuid) return new Uint8Array(0);
    return new TextEncoder().encode(this.uuid);
  }

  parse(payload: Uint8Array): void {
    this.uuid = new TextDecoder().decode(payload);
  }
}
