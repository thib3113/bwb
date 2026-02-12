import { EventEmitter } from '../../utils/EventEmitter';
import {
  BLEOpcode,
  SIMULATOR_DEFAULT_CONFIG_KEY,
  SIMULATOR_DEFAULT_PIN
} from '../../utils/bleConstants';
import { createPacket } from '../../utils/packetParser';
import { PacketFactory } from '../packets/PacketFactory';
import { OpenDoorPacket } from '../packets/OpenDoorPacket';
import { DeleteMasterCodePacket } from '../packets/PinManagementPackets';

export interface LogEntry {
  opcode: number;
  timestamp: number; // Unix timestamp in ms (simulated)
  payload: number[];
}

export interface BoksState {
  isOpen: boolean;
  pinCodes: Map<string, string>; // code -> type (master/single/multi)
  logs: LogEntry[];
  configKey: string;
  chaosMode: boolean;
  batteryLevel: number;
  firmwareRevision: string; // Maps to Hardware Version
  softwareRevision: string; // Maps to Software Version
}

export class BoksSimulator extends EventEmitter {
  private static instance: BoksSimulator | null = null;
  private state: BoksState;
  private autoCloseTimer: ReturnType<typeof setTimeout> | null = null;
  private chaosTimer: ReturnType<typeof setTimeout> | null = null;

  public static getInstance(): BoksSimulator {
    if (!BoksSimulator.instance) {
      BoksSimulator.instance = new BoksSimulator();
    }
    return BoksSimulator.instance;
  }

  constructor() {
    super();
    this.state = this.loadState() || this.getInitialState();

    // Expose instance for tests/debug
    if (typeof window !== 'undefined') {
      window.boksSimulator = this;
      console.log('[BoksSimulator] Instance exposed to window.boksSimulator');
    }
  }

  public getPublicState(): BoksState {
    return { ...this.state };
  }

  public setVersion(software: string, firmware: string) {
    this.state.softwareRevision = software;
    this.state.firmwareRevision = firmware;
    this.saveState();
  }

  public setBatteryLevel(level: number) {
    this.state.batteryLevel = level;
    this.saveState();
  }

  private getInitialState(): BoksState {
    return {
      isOpen: false,
      pinCodes: new Map([[SIMULATOR_DEFAULT_PIN, 'master']]),
      logs: [],
      configKey: SIMULATOR_DEFAULT_CONFIG_KEY,
      chaosMode: false,
      batteryLevel: 100,
      firmwareRevision: '10/125', // Default Hardware Version (maps to 4.0)
      softwareRevision: '4.1.14' // Default Software Version
    };
  }

  private saveState() {
    if (typeof localStorage !== 'undefined') {
      try {
        const serializableState = {
          ...this.state,
          pinCodes: Array.from(this.state.pinCodes.entries())
        };
        localStorage.setItem('boks_simulator_state', JSON.stringify(serializableState));
      } catch (e) {
        console.error('[BoksSimulator] Failed to save state:', e);
      }
    }
  }

  private loadState(): BoksState | null {
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem('boks_simulator_state');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.pinCodes) {
            parsed.pinCodes = new Map(parsed.pinCodes);
          }
          console.log('[BoksSimulator] State loaded from localStorage');
          return parsed as BoksState;
        }
      } catch (e) {
        console.error('[BoksSimulator] Failed to load state:', e);
      }
    }
    return null;
  }

  public reset() {
    this.state = this.getInitialState();
    this.saveState();
    if (this.autoCloseTimer) clearTimeout(this.autoCloseTimer);
    if (this.chaosTimer) clearInterval(this.chaosTimer);
  }

  public setChaosMode(enabled: boolean) {
    this.state.chaosMode = enabled;
    this.saveState();
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
        this.saveState();
      }
    }, 10000); // Check every 10s
  }

  // --- External Triggers ---

  public triggerNfcScan(uid: string) {
    console.log(`[Simulator] NFC Tag Scanned for Registration: ${uid}`);
    // Convert hex string (e.g. "04:A1:B2") to bytes
    const bytes = uid.split(':').map((b) => parseInt(b, 16));

    // Send NOTIFY_NFC_TAG_REGISTER_SCAN_RESULT (0xC5)
    // Payload usually: UID bytes
    this.sendNotification(BLEOpcode.NOTIFY_NFC_TAG_REGISTER_SCAN_RESULT, bytes);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public triggerDoorOpen(source: 'ble' | 'nfc' | 'button', _code?: string) {
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
    this.saveState();
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
    this.saveState();
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
      timestamp: Date.now()
    });
    this.saveState();
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
      case BLEOpcode.CREATE_MASTER_CODE:
        this.handleCreateCode(payload, 'master');
        break;
      case BLEOpcode.CREATE_SINGLE_USE_CODE:
        this.handleCreateCode(payload, 'single');
        break;
      case BLEOpcode.CREATE_MULTI_USE_CODE:
        this.handleCreateCode(payload, 'multi');
        break;
      case BLEOpcode.DELETE_SINGLE_USE_CODE:
      case BLEOpcode.DELETE_MULTI_USE_CODE:
        this.handleDeleteCode();
        break;
      case BLEOpcode.SET_CONFIGURATION:
        this.handleSetConfiguration();
        break;
      case 0x17:
        this.handleRegisterNfcTagScanStart();
        break;
      case BLEOpcode.REGISTER_NFC_TAG:
        this.handleRegisterNfcTag(payload);
        break;
      case BLEOpcode.UNREGISTER_NFC_TAG:
        this.handleUnregisterNfcTag(payload);
        break;
      default:
        console.warn(`[Simulator] Unknown opcode 0x${opcode.toString(16)}`);
    }
  }

  private sendNotification(opcode: number, payload: number[] | Uint8Array) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('boks-rx', {
          detail: { opcode, payload: Array.from(payload) }
        })
      );
    }
    const packetRaw = createPacket(opcode, payload);
    this.emit('notification', packetRaw);
  }

  // --- Command Handlers ---

  private handleSetConfiguration() {
    this.sendNotification(BLEOpcode.NOTIFY_SET_CONFIGURATION_SUCCESS, []);
  }

  private handleCreateCode(payload: Uint8Array, type: 'master' | 'single' | 'multi') {
    // Payload structure for Create Code is usually [KEY(4), INDEX(1), PIN(N)] or similar
    // But protocol spec for V1/V2 is complex.
    // For simulation, we assume the payload contains the PIN at the end.
    // Simplified parsing: Extract PIN from payload.
    // Standard payload: ConfigKey(4) + Index(1) + Pin(var)
    if (payload.length < 5) return;

    const pinBytes = payload.slice(5);
    const pin = new TextDecoder().decode(pinBytes).replace(/\0/g, '');

    if (pin) {
      this.state.pinCodes.set(pin, type);
      this.sendNotification(BLEOpcode.CODE_OPERATION_SUCCESS, []);
      this.saveState();
    } else {
      this.sendNotification(BLEOpcode.CODE_OPERATION_ERROR, []);
    }
  }

  private handleDeleteCode() {
    // Simplified: we assume we can delete by index or something, but here we just ACK success.
    // Real Boks deletes by Index.
    // For this simplified simulator, we can't easily map Index -> Code without a more complex state.
    // So we just return Success to unblock the UI.
    this.sendNotification(BLEOpcode.CODE_OPERATION_SUCCESS, []);
  }

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
      this.sendNotification(BLEOpcode.NOTIFY_LOGS_COUNT, [count & 0xFF, (count >> 8) & 0xFF]);
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
      (masterCount >> 8) & 0xFF,
      masterCount & 0xFF,
      (singleCount >> 8) & 0xFF,
      singleCount & 0xFF
    ]);
  }

  private handleDeleteMasterCode(payload: Uint8Array) {
    const packet = new DeleteMasterCodePacket();
    packet.parse(payload);
    if (packet.index === 0 && this.state.pinCodes.has(SIMULATOR_DEFAULT_PIN)) {
      this.state.pinCodes.delete(SIMULATOR_DEFAULT_PIN);
      this.sendNotification(BLEOpcode.CODE_OPERATION_SUCCESS, []);
      this.saveState();
    } else {
      this.sendNotification(BLEOpcode.CODE_OPERATION_ERROR, []);
    }
  }

  // --- NFC Handlers ---

  private handleRegisterNfcTagScanStart() {
    // Ack success to allow UI to proceed to 'Scanning...'
    console.log('[Simulator] NFC Scan Started (Ack 0x77)');
    this.sendNotification(0x77, []);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private handleRegisterNfcTag(_payload: Uint8Array) {
    // Payload: Key + UID + Type?
    // Assuming simplified success
    this.sendNotification(BLEOpcode.NOTIFY_NFC_TAG_REGISTERED_SUCCESS, []);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private handleUnregisterNfcTag(_payload: Uint8Array) {
    // Payload: Key + UID?
    this.sendNotification(BLEOpcode.NOTIFY_NFC_TAG_UNREGISTERED_SUCCESS, []);
  }
}
