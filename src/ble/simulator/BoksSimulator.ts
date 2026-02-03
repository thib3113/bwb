import { EventEmitter } from '../../utils/EventEmitter';
import {
  BLEOpcode,
  SIMULATOR_DEFAULT_CONFIG_KEY,
  SIMULATOR_DEFAULT_PIN,
} from '../../utils/bleConstants';
import { createPacket } from '../../utils/packetParser';
import { BoksRXPacket } from '../packets/rx/BoksRXPacket';
import { PacketFactory } from '../packets/PacketFactory';
import { OpenDoorPacket } from '../packets/OpenDoorPacket';
import { DeleteMasterCodePacket } from '../packets/PinManagementPackets';

// State of the virtual Boks
interface BoksState {
  isOpen: boolean;
  pinCodes: Map<string, string>; // code -> type (master/single/multi)
  logs: any[];
  configKey: string;
}

export class BoksSimulator extends EventEmitter {
  private state: BoksState = {
    isOpen: false,
    pinCodes: new Map([
      [SIMULATOR_DEFAULT_PIN, 'master'], // Default Master Code
    ]),
    logs: [],
    configKey: SIMULATOR_DEFAULT_CONFIG_KEY, // Default Config Key
  };

  constructor() {
    super();
  }

  // Process an incoming TX packet (from App to Boks)
  public handlePacket(opcode: number, payload: Uint8Array): void {
    setTimeout(
      () => {
        this.processCommand(opcode, payload);
      },
      50 // Fast response for tests
    );
  }

  private processCommand(opcode: number, payload: Uint8Array) {
    switch (opcode) {
      case BLEOpcode.OPEN_DOOR:
        this.handleOpenDoor(payload);
        break;
      case BLEOpcode.ASK_DOOR_STATUS:
        this.handleAskDoorStatus();
        break;
      case BLEOpcode.GET_LOGS_COUNT:
        this.handleGetLogsCount();
        break;
      case BLEOpcode.REQUEST_LOGS:
        this.handleRequestLogs();
        break;
      case BLEOpcode.TEST_BATTERY:
        this.handleTestBattery();
        break;
      case BLEOpcode.COUNT_CODES:
        this.handleCountCodes();
        break;
      case BLEOpcode.DELETE_MASTER_CODE:
        this.handleDeleteMasterCode(payload);
        break;
      // Add other commands as needed
      default:
        console.warn(`[Simulator] Unknown opcode 0x${opcode.toString(16)}`);
    }
  }

  private sendNotification(opcode: number, payload: number[] | Uint8Array) {
    // Emit event for tests to verify what the Simulator is sending (RX)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('boks-rx', {
          detail: {
            opcode,
            payload: Array.from(payload),
          },
        })
      );
    }

    // Use shared createPacket which now handles 0xC3 length logic
    const packetRaw = createPacket(opcode, payload);
    this.emit('notification', packetRaw);
  }

  // --- Command Handlers ---

  private handleOpenDoor(payload: Uint8Array) {
    const packet = PacketFactory.createTX(BLEOpcode.OPEN_DOOR, payload);
    if (!packet || !(packet instanceof OpenDoorPacket)) {
      console.warn('[Simulator] Failed to parse OpenDoor packet');
      return;
    }

    const code = packet.pinCode;
    console.log(`[Simulator] Open Door attempt with code: ${code}`);

    if (this.state.pinCodes.has(code)) {
      this.sendNotification(BLEOpcode.VALID_OPEN_CODE, []);

      // Simulate physical door opening delay
      setTimeout(() => {
        this.state.isOpen = true;

        // Log Open (0x91)
        this.sendNotification(BLEOpcode.LOG_DOOR_OPEN_HISTORY, []);

        // Status Update
        this.sendNotification(BLEOpcode.NOTIFY_DOOR_STATUS, [0x01]);

        // Auto-close after 5 seconds
        setTimeout(() => {
          this.state.isOpen = false;
          this.sendNotification(BLEOpcode.LOG_DOOR_CLOSE_HISTORY, []); // 0x90
          this.sendNotification(BLEOpcode.NOTIFY_DOOR_STATUS, [0x00]);
        }, 5000);
      }, 1000);
    } else {
      this.sendNotification(BLEOpcode.INVALID_OPEN_CODE, []);
    }
  }

  private handleAskDoorStatus() {
    this.sendNotification(BLEOpcode.ANSWER_DOOR_STATUS, [this.state.isOpen ? 0x01 : 0x00]);
  }

  private handleGetLogsCount() {
    // Simulate the "0 then real count" quirk
    this.sendNotification(BLEOpcode.NOTIFY_LOGS_COUNT, [0, 0]);

    setTimeout(() => {
      // Real count: 5 logs = [0x05, 0x00] (Little Endian)
      this.sendNotification(BLEOpcode.NOTIFY_LOGS_COUNT, [5, 0]);
    }, 150);
  }

  private handleRequestLogs() {
    // Stream 5 fake logs
    let i = 0;
    const interval = setInterval(() => {
      if (i >= 5) {
        clearInterval(interval);
        this.sendNotification(BLEOpcode.LOG_END_HISTORY, []);
        return;
      }

      // Fake log packet
      this.sendNotification(BLEOpcode.LOG_CODE_BLE_VALID_HISTORY, [0, 0, 0, 10 + i]); // Fake age
      i++;
    }, 100);
  }

  private handleCountCodes() {
    // Notify Code Count 0xC3
    // Format: [Master MSB, Master LSB, Single MSB, Single LSB] (Big Endian)

    let masterCount = 0;
    let singleCount = 0;

    for (const type of this.state.pinCodes.values()) {
      if (type === 'master') masterCount++;
      else if (type === 'single') singleCount++;
    }

    this.sendNotification(BLEOpcode.NOTIFY_CODES_COUNT, [
      (masterCount >> 8) & 0xff,
      masterCount & 0xff,
      (singleCount >> 8) & 0xff,
      singleCount & 0xff,
    ]);
  }

  private handleDeleteMasterCode(payload: Uint8Array) {
    const packet = new DeleteMasterCodePacket();
    packet.parse(payload);

    // Basic simulation
    // We assume SIMULATOR_DEFAULT_PIN is at Index 0.
    if (packet.index === 0 && this.state.pinCodes.has(SIMULATOR_DEFAULT_PIN)) {
      this.state.pinCodes.delete(SIMULATOR_DEFAULT_PIN);
      this.sendNotification(BLEOpcode.CODE_OPERATION_SUCCESS, []);
    } else {
      this.sendNotification(BLEOpcode.CODE_OPERATION_ERROR, []);
    }
  }

  private handleTestBattery() {
    // Not strictly a notification response usually
  }
}
