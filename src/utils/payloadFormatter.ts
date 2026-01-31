import { parsePayload } from './payloadParser';

/**
 * Formats the payload of a BLE packet into a human-readable string based on its opcode.
 * @param opcode The opcode of the packet.
 * @param payloadHex The payload as a hex string (e.g., "02 00 01").
 * @returns A formatted string describing the payload, or the original hex if no formatter is available.
 */
export function formatPayload(opcode: number, payloadHex: string): string {
  // If payload is empty, return a simple message
  if (!payloadHex || payloadHex.trim() === '') {
    return '(empty)';
  }

  try {
    // Convert hex string back to Uint8Array for easier processing
    const payloadBytes = new Uint8Array(
      payloadHex
        .split(' ')
        .filter((part) => part !== '')
        .map((part) => parseInt(part, 16))
    );

    // Use the external parser
    const dummyRaw = new Uint8Array(2 + payloadBytes.length);
    dummyRaw[0] = opcode;
    dummyRaw[1] = payloadBytes.length;
    dummyRaw.set(payloadBytes, 2);

    const parsedPayload = parsePayload(opcode, payloadBytes, dummyRaw);

    if (parsedPayload) {
      // If we have a parsed payload, use its toString method
      return parsedPayload.toString();
    } else {
      // For unknown opcodes or parsing failures, return the original hex payload
      return payloadHex;
    }
  } catch (e) {
    console.error(`Error formatting payload for opcode 0x${opcode.toString(16)}:`, e);
    // In case of error, return the original hex payload
    return payloadHex;
  }
}
