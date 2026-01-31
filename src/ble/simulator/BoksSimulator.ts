import { EventEmitter } from '../../utils/EventEmitter';
import { BLEOpcode } from '../../utils/bleConstants';
import { BLEPacket, createPacket } from '../../utils/packetParser';
import { parsePayload } from '../../utils/payloadParser';
import { BLEServiceEvent } from '../../services/BoksBLEService';

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
      ['123456', 'master'], // Default Master Code
    ]),
    logs: [],
    configKey: 'AABBCCDD', // Default Config Key
  };

  constructor() {
    super();
  }

  // Process an incoming TX packet (from App to Boks)
  public handlePacket(opcode: number, payload: Uint8Array): void {
    console.log(`[Simulator] Received Opcode: 0x${opcode.toString(16)}`);

    setTimeout(() => {
        this.processCommand(opcode, payload);
    }, 200 + Math.random() * 300); // Simulate processing delay (200-500ms)
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
        // Add other commands as needed
      default:
        console.warn(`[Simulator] Unknown opcode 0x${opcode.toString(16)}`);
        // Optionally send ERROR_COMMAND_NOT_SUPPORTED
    }
  }

  private sendNotification(opcode: number, payload: number[] | Uint8Array) {
    const packetRaw = createPacket(opcode, payload);
    
    // In a real scenario, this goes to the characteristic.
    // Here we emit an event that the Mock Service listens to.
    this.emit('notification', packetRaw);
  }

  // --- Command Handlers ---

  private handleOpenDoor(payload: Uint8Array) {
    const code = new TextDecoder().decode(payload);
    console.log(`[Simulator] Open Door attempt with code: ${code}`);

    if (this.state.pinCodes.has(code)) {
      this.sendNotification(BLEOpcode.VALID_OPEN_CODE, []);
      
      // Simulate physical door opening delay
      setTimeout(() => {
        this.state.isOpen = true;
        this.sendNotification(BLEOpcode.LOG_DOOR_OPEN_HISTORY, []); // 0x91
        this.sendNotification(BLEOpcode.NOTIFY_DOOR_STATUS, [0x01]); // Update status
        
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
    // 0x85 Response
    this.sendNotification(BLEOpcode.ANSWER_DOOR_STATUS, [this.state.isOpen ? 0x01 : 0x00]);
  }

  private handleGetLogsCount() {
    // Simulate the "0 then real count" quirk
    this.sendNotification(BLEOpcode.NOTIFY_LOGS_COUNT, [0, 0]); // 0
    
    setTimeout(() => {
        // Real count (Little Endian uint16)
        // Let's say we have 5 logs
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
        
        // Fake log packet: [Age(4 bytes), Data...]
        // Just sending empty payload for now or minimal structure to pass parser
        // TODO: Construct proper history packets if needed for strict parsing
        this.sendNotification(BLEOpcode.LOG_CODE_BLE_VALID_HISTORY, [0, 0, 0, 10 + i]); // Fake age
        i++;
    }, 100);
  }

  private handleTestBattery() {
      // Not strictly a notification response usually, but we can simulate data availability on the proprietary char
      // For now, let's just do nothing or emit a success if needed.
  }
}
