import { EventEmitter } from '../../utils/EventEmitter';
import {
  BLEOpcode,
  SIMULATOR_DEFAULT_CONFIG_KEY,
  SIMULATOR_DEFAULT_PIN,
} from '../../utils/bleConstants';
import { createPacket } from '../../utils/packetParser';
import { PacketFactory } from '../packets/PacketFactory';
import { OpenDoorPacket } from '../packets/OpenDoorPacket';
import { DeleteMasterCodePacket } from '../packets/PinManagementPackets';

// --- Interfaces ---

interface LogEntry {
  opcode: number;
  timestamp: number; // Unix timestamp in ms (simulated)
  payload: number[];
}

interface BoksState {
  isOpen: boolean;
  pinCodes: Map<string, string>; // code -> type (master/single/multi)
  logs: LogEntry[];
  configKey: string;
  chaosMode: boolean;
  batteryLevel: number;
}

// Controller API exposed to window
export interface SimulatorAPI {
  enableChaos(enabled: boolean): void;
  setBatteryLevel(level: number): void;
  triggerDoorOpen(source: 'ble' | 'nfc' | 'button', code?: string): void;
  triggerDoorClose(): void;
  reset(): void;
  getState(): BoksState;
}

export class BoksSimulator extends EventEmitter {
  private state: BoksState;
  private autoCloseTimer: any = null;
  private chaosTimer: any = null;

  constructor() { console.log('[BoksSimulator] Controller exposed to window');
    super();
    this.state = this.getInitialState();

    // Expose controller
    if (typeof window !== 'undefined') {
      (window as any).boksSimulatorController = {
        enableChaos: (e: boolean) => this.setChaosMode(e),
        setBatteryLevel: (l: number) => {
          this.state.batteryLevel = l;
        },
        triggerDoorOpen: (s: 'ble' | 'nfc' | 'button', c?: string) => this.triggerDoorOpen(s, c),
        triggerDoorClose: () => this.triggerDoorClose(),
        reset: () => this.reset(),
        getState: () => ({ ...this.state }),
      } as SimulatorAPI;
    }
  }

  private getInitialState(): BoksState {
    return {
      isOpen: false,
      pinCodes: new Map([[SIMULATOR_DEFAULT_PIN, 'master']]),
      logs: [],
      configKey: SIMULATOR_DEFAULT_CONFIG_KEY,
      chaosMode: false,
      batteryLevel: 100,
    };
  }

  public reset() {
    this.state = this.getInitialState();
    if (this.autoCloseTimer) clearTimeout(this.autoCloseTimer);
    if (this.chaosTimer) clearInterval(this.chaosTimer);
  }

  public setChaosMode(enabled: boolean) {
    this.state.chaosMode = enabled;
    if (enabled) {
      this.startChaosLoop();
    } else {
      if (this.chaosTimer) clearInterval(this.chaosTimer);
    }
  }

  private startChaosLoop() {
    if (this.chaosTimer) clearInterval(this.chaosTimer);
    this.chaosTimer = setInterval(() => {
      if (!this.state.chaosMode) return;

      const rand = Math.random();
      if (rand < 0.3 && !this.state.isOpen) {
        // 30% chance to open door via NFC if closed
        this.triggerDoorOpen('nfc');
      } else if (rand > 0.9) {
        // 10% chance to drop battery
        this.state.batteryLevel = Math.max(0, this.state.batteryLevel - 5);
      }
    }, 10000); // Check every 10s
  }

  // --- External Triggers ---

  public triggerDoorOpen(source: 'ble' | 'nfc' | 'button', code?: string) {
    if (this.state.isOpen) {
      console.log('[Simulator] Ignored Open Trigger: Door already open');
      return;
    }

    this.state.isOpen = true;
    console.log(`[Simulator] Door Opened via ${source}`);

    // 1. Notify Status
    this.sendNotification(BLEOpcode.NOTIFY_DOOR_STATUS, [0x00, 0x01]);

    // 2. Log Entry
    const logOpcode =
      source === 'ble'
        ? BLEOpcode.LOG_CODE_BLE_VALID_HISTORY
        : source === 'nfc'
          ? BLEOpcode.LOG_EVENT_NFC_OPENING
          : BLEOpcode.LOG_CODE_KEY_VALID_HISTORY; // fallback
    this.addLog(logOpcode, [0, 0, 0, 0]); // simplified payload

    // 3. Auto Close Schedule
    this.scheduleAutoClose();
  }

  public triggerDoorClose() {
    if (!this.state.isOpen) return;

    this.state.isOpen = false;
    console.log('[Simulator] Door Closed');

    // 1. Notify Status
    this.sendNotification(BLEOpcode.NOTIFY_DOOR_STATUS, [0x01, 0x00]);

    // 2. Log Entry
    this.addLog(BLEOpcode.LOG_DOOR_CLOSE_HISTORY, []);

    if (this.autoCloseTimer) clearTimeout(this.autoCloseTimer);
  }

  private scheduleAutoClose() {
    if (this.autoCloseTimer) clearTimeout(this.autoCloseTimer);
    const delay = Math.floor(Math.random() * (15000 - 5000) + 5000); // 5-15s
    this.autoCloseTimer = setTimeout(() => {
      this.triggerDoorClose();
    }, delay);
  }

  private addLog(opcode: number, payload: number[]) {
    this.state.logs.push({
      opcode,
      payload,
      timestamp: Date.now(),
    });
  }

  // --- BLE Protocol Handling ---

  public handlePacket(opcode: number, payload: Uint8Array): void {
    setTimeout(() => {
      this.processCommand(opcode, payload);
    }, 50);
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
      case BLEOpcode.COUNT_CODES:
        this.handleCountCodes();
        break;
      case BLEOpcode.DELETE_MASTER_CODE:
        this.handleDeleteMasterCode(payload);
        break;
      default:
        console.warn(`[Simulator] Unknown opcode 0x${opcode.toString(16)}`);
    }
  }

  private sendNotification(opcode: number, payload: number[] | Uint8Array) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('boks-rx', {
          detail: { opcode, payload: Array.from(payload) },
        })
      );
    }
    const packetRaw = createPacket(opcode, payload);
    this.emit('notification', packetRaw);
  }

  // --- Command Handlers ---

  private handleOpenDoor(payload: Uint8Array) {
    const packet = PacketFactory.createTX(BLEOpcode.OPEN_DOOR, payload);
    if (!packet || !(packet instanceof OpenDoorPacket)) return;

    const code = packet.pinCode;
    console.log(`[Simulator] BLE Open Door Request: ${code}`);

    if (this.state.pinCodes.has(code)) {
      this.sendNotification(BLEOpcode.VALID_OPEN_CODE, []);

      // If already open, do nothing physical, just ack validity
      if (!this.state.isOpen) {
        // Simulate mechanic delay
        setTimeout(() => {
          this.triggerDoorOpen('ble', code);
        }, 800);
      }
    } else {
      this.sendNotification(BLEOpcode.INVALID_OPEN_CODE, []);
    }
  }

  private handleAskDoorStatus() {
    const inverted = this.state.isOpen ? 0x00 : 0x01;
    const raw = this.state.isOpen ? 0x01 : 0x00;
    this.sendNotification(BLEOpcode.ANSWER_DOOR_STATUS, [inverted, raw]);
  }

  private handleGetLogsCount() {
    // Quirk: Send 0 first, then real count
    this.sendNotification(BLEOpcode.NOTIFY_LOGS_COUNT, [0, 0]);

    setTimeout(() => {
      const count = this.state.logs.length;
      this.sendNotification(BLEOpcode.NOTIFY_LOGS_COUNT, [count & 0XFF, (count >> 8) & 0XFF]);
    }, 150);
  }

  private handleRequestLogs() {
    // Stream logs from state
    const sortedLogs = [...this.state.logs].sort((a, b) => a.timestamp - b.timestamp);

    // "Time Travel" / Synthesis: Ensure coherent timestamps if we were to send real timestamps
    // But protocol sends "relative age" or "absolute date"?
    // Protocol V1 sends relative age usually or simplified index.
    // For this simulation, we'll send the stored payload or a synthesized one.
    // NOTE: Real Boks sends logs with Opcode specific to event type.

    let i = 0;
    const interval = setInterval(() => {
      if (i >= sortedLogs.length) {
        clearInterval(interval);
        this.sendNotification(BLEOpcode.LOG_END_HISTORY, []);
        return;
      }

      const log = sortedLogs[i];
      // We send the stored log opcode and payload
      this.sendNotification(log.opcode, log.payload);
      i++;
    }, 50); // 50ms interval
  }

  private handleCountCodes() {
    let masterCount = 0;
    let singleCount = 0;
    for (const type of this.state.pinCodes.values()) {
      if (type === 'master') masterCount++;
      else if (type === 'single') singleCount++;
    }
    // Big Endian for Counts
    this.sendNotification(BLEOpcode.NOTIFY_CODES_COUNT, [
      (masterCount >> 8) & 0XFF,
      masterCount & 0XFF,
      (singleCount >> 8) & 0XFF,
      singleCount & 0XFF,
    ]);
  }

  private handleDeleteMasterCode(payload: Uint8Array) {
    const packet = new DeleteMasterCodePacket();
    packet.parse(payload);
    if (packet.index === 0 && this.state.pinCodes.has(SIMULATOR_DEFAULT_PIN)) {
      this.state.pinCodes.delete(SIMULATOR_DEFAULT_PIN);
      this.sendNotification(BLEOpcode.CODE_OPERATION_SUCCESS, []);
    } else {
      this.sendNotification(BLEOpcode.CODE_OPERATION_ERROR, []);
    }
  }
}
