// Abstract base class for all RX packets
export abstract class BoksRXPacket {
  static readonly opcode: number;

  // Base properties common to all (if any)
  constructor(public readonly opcode: number) {}

  // Each packet knows how to parse its specific payload
  // Returns 'this' for chaining or the instance itself
  abstract parse(payload: Uint8Array): void;
}
