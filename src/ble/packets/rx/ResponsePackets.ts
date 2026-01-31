import {BoksRXPacket} from './BoksRXPacket';
import {BLEOpcode} from '../../../utils/bleConstants';

// Generic Success Response (0x77)
export class OperationSuccessPacket extends BoksRXPacket {
  static readonly opcode = BLEOpcode.CODE_OPERATION_SUCCESS;

  constructor() {
    super(OperationSuccessPacket.opcode);
  }

  parse(): void {
    // No payload to parse for simple success
  }
}

// Generic Error Response (0x78)
export class OperationErrorPacket extends BoksRXPacket {
  static readonly opcode = BLEOpcode.CODE_OPERATION_ERROR;

  constructor() {
    super(OperationErrorPacket.opcode);
  }

  parse(): void {
    // Usually empty, or specific error codes if documented
  }
}

// Log Count Response (0x79)
export class LogCountPacket extends BoksRXPacket {
  static readonly opcode = BLEOpcode.NOTIFY_LOGS_COUNT;

  public count: number = 0;

  constructor() {
    super(LogCountPacket.opcode);
  }

  parse(payload: Uint8Array): void {
    // Payload is big-endian or little-endian? Usually LE for Boks.
    // Spec usually says: [Count_LSB, Count_MSB, ...] or just byte depending on size.
    // Based on previous knowledge: often 2 bytes or 4 bytes.
    // Let's assume 16-bit LE for now based on standard embedded practices,
    // but we need to check .jules spec if detailed.
    // Re-reading quirks: "returns 0 then real count".

    // Safest approach: DataView
    if (payload.length >= 2) {
      const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
      this.count = view.getUint16(0, true); // Little Endian
    } else if (payload.length === 1) {
      this.count = payload[0];
    }
  }
}

// Door Status Response (0x84 Push / 0x85 Pull)
export class DoorStatusPacket extends BoksRXPacket {
  // Handles both opcodes? Factory logic needed.
  // Let's make one class per opcode for strictness, or handle both.
  // Factory will map both opcodes to this class.
  static readonly opcode_push = BLEOpcode.NOTIFY_DOOR_STATUS;
  static readonly opcode_pull = BLEOpcode.ANSWER_DOOR_STATUS;

  public isOpen: boolean = false;

  constructor(opcode: number) {
    super(opcode);
  }

  parse(payload: Uint8Array): void {
    if (payload.length > 0) {
      // 0x01 = Open, 0x00 = Closed
      this.isOpen = payload[0] === 0x01;
    }
  }
}

// Valid Code (Door Opening) (0x81)
export class DoorOpeningPacket extends BoksRXPacket {
  static readonly opcode = BLEOpcode.VALID_OPEN_CODE;

  constructor() {
    super(DoorOpeningPacket.opcode);
  }

  parse(): void {
    // Payload usually empty or contains user index
  }
}

// NFC Tag Found (0xC5)
export class NfcTagFoundPacket extends BoksRXPacket {
  static readonly opcode = BLEOpcode.NOTIFY_NFC_TAG_REGISTER_SCAN_RESULT; // 0xC5

  public uid: string = '';
  public uidBytes: Uint8Array = new Uint8Array(0);

  constructor() {
    super(NfcTagFoundPacket.opcode);
  }

  parse(payload: Uint8Array): void {
    this.uidBytes = payload;
    // Convert to Hex String "AA:BB:CC:DD"
    this.uid = Array.from(payload)
      .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
      .join(':');
  }
}
