import { BoksTXPacket } from './BoksTXPacket';
import { BLEOpcode } from '../../utils/bleConstants';
import { z } from 'zod';

/**
 * A virtual packet used to represent internal GATT operations (Read/Write Char)
 * in the packet log stream. These are not real Boks Protocol packets sent over the wire,
 * but useful for debugging.
 */
export class GattOperationPacket extends BoksTXPacket {
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
