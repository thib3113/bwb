import { BoksRXPacket } from './rx/BoksRXPacket';
import { BoksTXPacket } from './BoksTXPacket';
import { OperationSuccessPacket } from './rx/OperationSuccessPacket';
import { OperationErrorPacket } from './rx/OperationErrorPacket';
import { LogCountPacket } from './rx/LogCountPacket';
import { DoorStatusPacket } from './rx/DoorStatusPacket';
import { DoorOpeningPacket } from './rx/DoorOpeningPacket';
import { NfcScanResultPacket } from './rx/NfcScanResultPacket';
import { OpenDoorPacket } from './OpenDoorPacket';
import {
  CreateMasterCodePacket,
  CreateMultiUseCodePacket,
  CreateSingleUseCodePacket,
  DeleteMasterCodePacket,
  DeleteMultiUseCodePacket,
  DeleteSingleUseCodePacket,
} from './PinManagementPackets';
import { RequestLogsPacket } from './RequestLogsPacket';
import { GetLogsCountPacket } from './GetLogsCountPacket';
import { AskDoorStatusPacket, CountCodesPacket, TestBatteryPacket } from './StatusPackets';
import { SetConfigurationPacket } from './SetConfigurationPacket';
import { NfcScanStartPacket } from './NfcScanStartPacket';
import { NfcRegisterPacket } from './NfcRegisterPacket';
import { NfcUnregisterPacket } from './NfcUnregisterPacket';
import { BLEOpcode } from '../../utils/bleConstants';

export class PacketFactory {
  private static rxClassMap: Map<number, new (op: number) => BoksRXPacket> = new Map();
  private static txClassMap: Map<number, new () => BoksTXPacket> = new Map();

  static {
    // RX Packets
    this.registerRX(BLEOpcode.CODE_OPERATION_SUCCESS, OperationSuccessPacket);
    this.registerRX(BLEOpcode.CODE_OPERATION_ERROR, OperationErrorPacket);
    this.registerRX(BLEOpcode.NOTIFY_LOGS_COUNT, LogCountPacket);
    this.registerRX(BLEOpcode.NOTIFY_DOOR_STATUS, DoorStatusPacket);
    this.registerRX(BLEOpcode.ANSWER_DOOR_STATUS, DoorStatusPacket);
    this.registerRX(BLEOpcode.VALID_OPEN_CODE, DoorOpeningPacket);
    this.registerRX(BLEOpcode.NOTIFY_NFC_TAG_REGISTER_SCAN_RESULT, NfcScanResultPacket);
    this.registerRX(BLEOpcode.NOTIFY_NFC_TAG_REGISTER_SCAN_ERROR_EXISTS, NfcScanResultPacket);
    this.registerRX(BLEOpcode.NOTIFY_NFC_TAG_REGISTER_SCAN_TIMEOUT, NfcScanResultPacket);

    // TX Packets
    this.registerPacket(OpenDoorPacket);
    this.registerPacket(CreateMasterCodePacket);
    this.registerPacket(CreateSingleUseCodePacket);
    this.registerPacket(CreateMultiUseCodePacket);
    this.registerPacket(DeleteMasterCodePacket);
    this.registerPacket(DeleteSingleUseCodePacket);
    this.registerPacket(DeleteMultiUseCodePacket);
    this.registerPacket(RequestLogsPacket);
    this.registerPacket(GetLogsCountPacket);
    this.registerPacket(AskDoorStatusPacket);
    this.registerPacket(TestBatteryPacket);
    this.registerPacket(CountCodesPacket);
    this.registerPacket(SetConfigurationPacket);
    this.registerPacket(NfcScanStartPacket);
    this.registerPacket(NfcRegisterPacket);
    this.registerPacket(NfcUnregisterPacket);
  }

  static registerRX(opcode: number, ctor: new (op: number) => BoksRXPacket) {
    this.rxClassMap.set(opcode, ctor);
  }

  static registerTX(opcode: number, ctor: new () => BoksTXPacket) {
    this.txClassMap.set(opcode, ctor);
  }

  /**
   * Registers a TX packet class by inferring its opcode from the static property.
   * This is preferred over registerTX as it avoids duplication and potential mismatch.
   */
  static registerPacket(ctor: typeof BoksTXPacket & (new () => BoksTXPacket)) {
    this.txClassMap.set(ctor.opcode, ctor);
  }

  // Backwards compatibility or RX preference
  static create(opcode: number, payload: Uint8Array): BoksRXPacket | null {
    return this.createRX(opcode, payload);
  }

  static createRX(opcode: number, payload: Uint8Array): BoksRXPacket | null {
    const PacketClass = this.rxClassMap.get(opcode);
    if (!PacketClass) {
      return null;
    }

    const packet = new PacketClass(opcode);
    packet.parse(payload);
    return packet;
  }

  static createTX(opcode: number, payload: Uint8Array): BoksTXPacket | null {
    const PacketClass = this.txClassMap.get(opcode);
    if (!PacketClass) {
      return null;
    }

    const packet = new PacketClass();
    packet.parse(payload);
    return packet;
  }

  static getRegisteredTXPackets(): Map<number, new () => BoksTXPacket> {
    return this.txClassMap;
  }
}
