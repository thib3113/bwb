import { BoksRXPacket } from './rx/BoksRXPacket';
import { 
  OperationSuccessPacket, 
  OperationErrorPacket, 
  LogCountPacket, 
  DoorStatusPacket, 
  DoorOpeningPacket,
  NfcTagFoundPacket 
} from './rx/ResponsePackets';
import { BLEOpcode } from '../../utils/bleConstants';

export class RXPacketFactory {
  private static classMap: Map<number, new (op: number) => BoksRXPacket> = new Map();

  static {
    this.register(BLEOpcode.CODE_OPERATION_SUCCESS, OperationSuccessPacket);
    this.register(BLEOpcode.CODE_OPERATION_ERROR, OperationErrorPacket);
    this.register(BLEOpcode.NOTIFY_LOGS_COUNT, LogCountPacket);
    this.register(BLEOpcode.NOTIFY_DOOR_STATUS, DoorStatusPacket);
    this.register(BLEOpcode.ANSWER_DOOR_STATUS, DoorStatusPacket);
    this.register(BLEOpcode.VALID_OPEN_CODE, DoorOpeningPacket);
    this.register(BLEOpcode.NOTIFY_NFC_TAG_REGISTER_SCAN_RESULT, NfcTagFoundPacket);
  }

  // Allow registering custom/new packets dynamically if needed
  static register(opcode: number, ctor: new (op: number) => BoksRXPacket) {
    this.classMap.set(opcode, ctor);
  }

  static create(opcode: number, payload: Uint8Array): BoksRXPacket | null {
    const PacketClass = this.classMap.get(opcode);
    if (!PacketClass) {
      return null;
    }

    const packet = new PacketClass(opcode);
    packet.parse(payload);
    return packet;
  }
}