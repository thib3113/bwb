// Utility functions for parsing BLE packets
import { BLE_PACKET_CHECKSUM_MASK, BLEOpcode } from './bleConstants';
import { ParsedPayload } from './payloadParser';

export interface BLEPacket {
  opcode: number;
  payload: Uint8Array;
  raw: Uint8Array;
  direction?: 'TX' | 'RX';
  parsedPayload?: ParsedPayload; // Will be attached by the payload parser
  isValidChecksum?: boolean;
  uuid?: string; // Optional UUID for GATT operations
}

export function parsePacket(data: DataView): BLEPacket | null {
  // Convert DataView to byte array
  const bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);

  // Basic packet structure: [opcode, length, ...payload, checksum]
  if (bytes.length < 2) {
    return null;
  }

  const opcode = bytes[0];

  const isValidChecksum = verifyChecksum(bytes);

  // Payload extraction logic
  // For most opcodes, payload is [2 ... end-1] (length byte is payload length)
  // For 0xC3 (NOTIFY_CODES_COUNT), the 'length' byte (0x07) is TOTAL length (including opcode/len/checksum)
  // So payload is [2 ... end-1] effectively, but 'length' byte semantics differ.
  // Our generic logic here ignores 'length' byte for slicing, relying on the actual buffer size.
  // This is robust for both cases as long as 'bytes' contains the full frame.

  // Standard: [Opcode, Len, P1, P2, ..., Pn, Checksum]
  // If checksum is present, payload ends at length - 1.
  const payload = bytes.length > 2 ? bytes.slice(2, bytes.length - 1) : new Uint8Array(0);

  return {
    opcode,
    payload,
    raw: bytes,
    isValidChecksum
  };
}

export function verifyChecksum(data: Uint8Array): boolean {
  if (data.length < 1) return false;
  const payloadPart = data.slice(0, -1);
  const checksum = data[data.length - 1];
  const calculated = payloadPart.reduce((a, b) => a + b, 0) & BLE_PACKET_CHECKSUM_MASK;
  return calculated === checksum;
}

export function createPacket(opcode: number, payload: number[] | Uint8Array = []): Uint8Array {
  // Create a packet with opcode and payload
  const payloadArray = payload instanceof Uint8Array ? payload : new Uint8Array(payload);

  // Calculate total size: Opcode (1) + Length (1) + Payload (N) + Checksum (1)
  const packet = new Uint8Array(2 + payloadArray.length + 1);

  packet[0] = opcode;

  // SPECIAL CASE: For 0xC3, Length byte is TOTAL LENGTH
  if (opcode === BLEOpcode.NOTIFY_CODES_COUNT) {
    packet[1] = packet.length; // Total length
  } else {
    packet[1] = payloadArray.length; // Payload length (Standard)
  }

  packet.set(payloadArray, 2);

  // Calculate checksum
  const checksum = packet.slice(0, -1).reduce((a, b) => a + b, 0) & BLE_PACKET_CHECKSUM_MASK;
  packet[packet.length - 1] = checksum;

  return packet;
}

export function decodeStringPayload(payload: Uint8Array): string {
  // Decode payload as UTF-8 string
  return new TextDecoder().decode(payload);
}

export function encodeStringPayload(str: string): Uint8Array {
  // Encode string as UTF-8 payload
  return new TextEncoder().encode(str);
}
