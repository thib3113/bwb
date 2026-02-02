import { BLE_PACKET_CHECKSUM_MASK } from '../../utils/bleConstants';
import { z } from 'zod';

// Abstract base class for all TX packets
export abstract class BoksTXPacket {
  // Static abstract-like property (to be implemented by subclasses)
  static get opcode(): number {
    throw new Error('Opcode not implemented');
  }

  // Helper to access the static opcode from an instance
  get opcode(): number {
    return (this.constructor as typeof BoksTXPacket).opcode;
  }

  /**
   * Optional Zod schema for validation and form generation.
   * If not provided, the packet is considered to have no configurable payload.
   */
  static schema?: z.ZodObject<any>;

  /**
   * Returns the payload byte array (Excluding Opcode, Length and Checksum)
   * This must be implemented by concrete command classes.
   * @param configKey Optional configuration key injected by the service.
   * @throws Error if required parameters are missing.
   */
  abstract toPayload(configKey?: string): Uint8Array;

  /**
   * Parses the payload byte array (Excluding Opcode, Length and Checksum)
   * into the packet's properties.
   * This allows interpreting a raw packet (e.g. for debugging or simulator).
   */
  abstract parse(payload: Uint8Array): void;

  /**
   * Constructs the full binary packet ready to be sent to the device.
   * Format: [Opcode, Length, ...Payload, Checksum]
   */
  public toPacket(): Uint8Array {
    const payload = this.toPayload();
    // 2 bytes header (Opcode + Length) + Payload + 1 byte Checksum
    const packet = new Uint8Array(2 + payload.length + 1);

    // Dynamic access to static opcode
    packet[0] = this.opcode;
    packet[1] = payload.length;
    packet.set(payload, 2);

    // Calculate Checksum (Sum of all bytes except the checksum byte itself)
    let sum = 0;
    for (let i = 0; i < packet.length - 1; i++) {
      sum += packet[i];
    }
    packet[packet.length - 1] = sum & BLE_PACKET_CHECKSUM_MASK;

    return packet;
  }

  protected stringToBytes(str: string): number[] {
    return str.split('').map((c) => c.charCodeAt(0));
  }
}
