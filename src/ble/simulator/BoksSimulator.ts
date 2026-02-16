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
import { db } from '../../db/db';
import { BoksNfcTagType } from '../../types/db';

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
  packetLossProbability: number;
  rssi: number;
  laPosteActivated: boolean;
}

export type CustomPacketHandler = (payload: Uint8Array) => boolean | Uint8Array;

export class BoksSimulator extends EventEmitter {
  private static instance: BoksSimulator | null = null;
  private state: BoksState;
  private autoCloseTimer: ReturnType<typeof setTimeout> | null = null;
  private chaosTimer: ReturnType<typeof setTimeout> | null = null;

  private nextConnectionError: Error | null = null;
  private nextDiscoveryError: Error | null = null;
  private responseDelay: number = 50;

  private customHandlers: Map<number, CustomPacketHandler> = new Map();

  public static getInstance(): BoksSimulator {
    if (!BoksSimulator.instance) {
      BoksSimulator.instance = new BoksSimulator();
    }
    return BoksSimulator.instance;
  }

  constructor() {
    super();
    this.state = this.loadState() || this.getInitialState();

    // Ensure laPosteActivated is present for migrated states
    if (this.state.laPosteActivated === undefined) {
      this.state.laPosteActivated = this.isLaPosteCompatible(this.state.softwareRevision);
    }

    // Expose instance for tests/debug
    if (typeof window !== 'undefined') {
      window.boksSimulator = this;
      console.log('[BoksSimulator] Instance exposed to window.boksSimulator');

      // Inject sample data
      this.seedDatabase();
    }
  }

  private isLaPosteCompatible(version: string): boolean {
    // Simple semver check assuming x.y.z format
    // 4.2.0 or higher
    const parts = version.split('.').map(Number);
    if (parts.length < 3) return false;
    if (parts[0] > 4) return true;
    if (parts[0] === 4) {
      if (parts[1] > 2) return true;
      if (parts[1] === 2 && parts[2] >= 0) return true;
    }
    return false;
  }

  private async seedDatabase() {
    try {
      const count = await db.nfc_tags.count();
      if (count === 0) {
        console.log('[BoksSimulator] Seeding DB with sample NFC tags...');
        await db.nfc_tags.bulkAdd([
          {
            id: 'sim-tag-1',
            device_id: 'sim-device', // Simplified
            uid: 'DE:AD:BE:EF:00:01',
            name: 'User Tag 1',
            type: BoksNfcTagType.USER_BADGE,
            created_at: Date.now(),
            sync_status: 'synced'
          },
          {
            id: 'sim-tag-2',
            device_id: 'sim-device',
            uid: 'CA:FE:BA:BE:00:02',
            name: 'User Tag 2',
            type: BoksNfcTagType.USER_BADGE,
            created_at: Date.now(),
            sync_status: 'synced'
          }
        ]);
      }
    } catch (e: unknown) {
      console.warn('[BoksSimulator] Failed to seed database (likely in test env):', e);
    }
  }

  public getPublicState(): BoksState {
    return { ...this.state };
  }

  public setVersion(software: string, firmware: string) {
    this.state.softwareRevision = software;
    this.state.firmwareRevision = firmware;
    this.state.laPosteActivated = this.isLaPosteCompatible(software);
    this.saveState();
  }

  public setBatteryLevel(level: number) {
    this.state.batteryLevel = level;
    this.saveState();
  }

  private getInitialState(): BoksState {
    const sw = '4.3.3';
    return {
      isOpen: false,
      pinCodes: new Map([[SIMULATOR_DEFAULT_PIN, 'master']]),
      logs: [],
      configKey: SIMULATOR_DEFAULT_CONFIG_KEY,
      chaosMode: false,
      batteryLevel: 100,
      firmwareRevision: '10/125', // Default Hardware Version (maps to 4.0)
      softwareRevision: sw,
      packetLossProbability: 0,
      rssi: -60,
      laPosteActivated: true // Since 4.3.3 > 4.2.0
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
      } catch (e: unknown) {
        console.error('[BoksSimulator] Failed to save state:', e);
      }
    }
  }

  private loadState(): BoksState | null {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('boks_simulator_state');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          return {
            ...parsed,
            pinCodes: new Map(parsed.pinCodes)
          };
        } catch (e: unknown) {
          console.error('[BoksSimulator] Failed to load state:', e);
        }
      }
    }
    return null;
  }

  public reset() {
    this.state = this.getInitialState();
    this.saveState();
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('boks_simulator_state');
    }
  }

  public setChaosMode(enabled: boolean) {
    this.state.chaosMode = enabled;
    this.saveState();
    if (enabled) {
      if (this.chaosTimer) clearInterval(this.chaosTimer);
      this.chaosTimer = setInterval(() => {
        this.chaosLoop();
      }, 5000); // Check every 5s (increased frequency for better demo)
    } else {
      if (this.chaosTimer) clearInterval(this.chaosTimer);
    }
  }

  private async chaosLoop() {
    if (!this.state.chaosMode) return;

    const rand = Math.random();

    // 40% chance to interact if door is closed
    if (!this.state.isOpen && rand < 0.4) {
      const actionRand = Math.random();
      if (actionRand < 0.7) {
        // 70% of interactions are NFC logs
        await this.generateRandomNfcLog();
      } else {
        // 30% are manual openings
        this.triggerDoorOpen('ble');
      }
    }
    // 5% chance to drop battery
    else if (rand > 0.95) {
      this.state.batteryLevel = Math.max(0, this.state.batteryLevel - 1);
      this.saveState();
    }
  }

  private async generateRandomNfcLog() {
    const types = [1, 2, 3]; // LaPoste, LaPosteOther, User (No Type 0)
    let type = types[Math.floor(Math.random() * types.length)];

    // Check constraints
    if ((type === 1 || type === 2) && !this.state.laPosteActivated) {
      // Fallback to User Tag only if La Poste disabled
      type = 3;
    }

    let uid = '';

    if (type === 3) { // User Tag
      // Try to get from DB
      try {
         const tags = await db.nfc_tags.toArray();
         if (tags.length > 0) {
           const randomTag = tags[Math.floor(Math.random() * tags.length)];
           uid = randomTag.uid;
         }
      } catch (e: unknown) {
        // DB access might fail or be empty
        console.warn('Error accessing DB for random tag:', e);
      }
    }

    // Generate random UID if still empty (or not User Tag)
    if (!uid) {
      uid = Array.from({ length: 7 }, () =>
        Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase()
      ).join(':');
    }

    this.triggerNfcDoorOpen(uid, type);
  }

  public triggerNfcDoorOpen(uid: string, type: number) {
    if (this.state.isOpen) return;

    // Open Door State
    this.state.isOpen = true;
    console.log(`[Simulator] Door Opened via NFC (Type ${type}, UID ${uid})`);

    this.sendNotification(BLEOpcode.NOTIFY_DOOR_STATUS, [0x00, 0x01]);

    // Construct Payload
    // Format: ... [Type (1B)] [UID Len (1B)] [UID Bytes (N)]
    // Opcode LOG_EVENT_NFC_OPENING (0xA1)

    const uidBytes = uid.split(':').map(x => parseInt(x, 16));
    const payload = [
       0, 0, 0, // 3 bytes placeholder for age/timestamp (handled by BaseLogPayload logic later if needed)
       type,
       uidBytes.length,
       ...uidBytes
    ];

    this.addLog(BLEOpcode.LOG_EVENT_NFC_OPENING, payload);

    // Auto Close
    this.scheduleAutoClose();
  }

  public stop() {
    console.log('[BoksSimulator] Stopping simulator...');
    if (this.autoCloseTimer) {
      clearTimeout(this.autoCloseTimer);
      this.autoCloseTimer = null;
    }
    if (this.chaosTimer) {
      clearInterval(this.chaosTimer);
      this.chaosTimer = null;
    }
  }

  public setResponseDelay(ms: number) {
    this.responseDelay = ms;
  }

  public failNextConnection(name: string = 'NetworkError', message: string = 'Connection failed') {
    const err = new Error(message);
    err.name = name;
    this.nextConnectionError = err;
  }

  public failNextDiscovery(name: string = 'NotFoundError', message: string = 'Device not found') {
    const err = new Error(message);
    err.name = name;
    this.nextDiscoveryError = err;
  }

  private scheduleAutoClose() {
    if (this.autoCloseTimer) clearTimeout(this.autoCloseTimer);
    const delay = Math.floor(Math.random() * (10000 - 5000) + 5000); // 5-10s
    this.autoCloseTimer = setTimeout(() => {
      this.triggerDoorClose();
    }, delay);
  }

  public triggerDoorClose() {
    if (!this.state.isOpen) return;
    this.state.isOpen = false;
    console.log('[Simulator] Door Closed');
    this.sendNotification(BLEOpcode.NOTIFY_DOOR_STATUS, [0x01, 0x00]);
    this.addLog(BLEOpcode.LOG_DOOR_CLOSE_HISTORY, [0, 0, 0, 0]);
    this.saveState();
  }

  private addLog(opcode: number, payload: number[]) {
    this.state.logs.push({
      opcode,
      payload,
      timestamp: Date.now()
    });
    this.saveState();
  }

  // --- New Simulation Capabilities ---

  public simulateDisconnect() {
    console.log('[Simulator] Simulating unexpected disconnection');
    this.emit('disconnect-event');
  }

  public setPacketLoss(probability: number) {
    if (probability < 0 || probability > 1) {
      console.warn('[Simulator] Packet loss probability must be between 0 and 1');
      return;
    }
    this.state.packetLossProbability = probability;
    this.saveState();
  }

  public setRssi(value: number) {
    this.state.rssi = value;
    this.emit('rssi-update', value);
    this.saveState();
  }

  public registerCustomHandler(opcode: number, handler: CustomPacketHandler) {
    this.customHandlers.set(opcode, handler);
  }

  public injectLog(opcode: number, payload: number[]) {
    this.addLog(opcode, payload);
    console.log(`[Simulator] Log injected: Opcode 0x${opcode.toString(16)}`);
  }

  public getPacketLossProbability(): number {
    return this.state.packetLossProbability;
  }

  // --- BLE Protocol Handling ---

  public handlePacket(opcode: number, payload: Uint8Array): void {
    // 1. Packet Loss Simulation
    if (this.state.packetLossProbability > 0 && Math.random() < this.state.packetLossProbability) {
      console.log(`[Simulator] Packet dropped (Loss Prob: ${this.state.packetLossProbability})`);
      return; // Drop packet
    }

    setTimeout(() => {
      // 2. Custom Handler Interception
      if (this.customHandlers.has(opcode)) {
        const handler = this.customHandlers.get(opcode)!;
        const result = handler(payload);

        if (result === false) {
           return;
        }
      }

      this.processCommand(opcode, payload);
    }, this.responseDelay);
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
    const sortedLogs = [...this.state.logs].sort((a, b) => a.timestamp - b.timestamp);
    let i = 0;
    const interval = setInterval(() => {
      if (i >= sortedLogs.length) {
        clearInterval(interval);
        this.sendNotification(BLEOpcode.LOG_END_HISTORY, []);
        return;
      }

      const log = sortedLogs[i];
      this.sendNotification(log.opcode, log.payload);
      i++;
    }, 50);
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
    console.log('[Simulator] NFC Scan Started (Ack 0x77)');
    this.sendNotification(0x77, []);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private handleRegisterNfcTag(_payload: Uint8Array) {
    this.sendNotification(BLEOpcode.NOTIFY_NFC_TAG_REGISTERED_SUCCESS, []);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private handleUnregisterNfcTag(_payload: Uint8Array) {
    this.sendNotification(BLEOpcode.NOTIFY_NFC_TAG_UNREGISTERED_SUCCESS, []);
  }

  // --- External Triggers ---

  public triggerNfcScan(uid: string) {
    console.log(`[Simulator] NFC Tag Scanned for Registration: ${uid}`);
    const bytes = uid.split(':').map((b) => parseInt(b, 16));
    this.sendNotification(BLEOpcode.NOTIFY_NFC_TAG_REGISTER_SCAN_RESULT, bytes);
  }

  public triggerDoorOpen(source: "ble" | "nfc" | "button", code?: string) {
    if (this.state.isOpen) {
      console.log('[Simulator] Ignored Open Trigger: Door already open');
      return;
    }

    this.state.isOpen = true;
    console.log(`[Simulator] Door Opened via ${source} (Code: ${code || 'None'})`);

    this.sendNotification(BLEOpcode.NOTIFY_DOOR_STATUS, [0x00, 0x01]);

    const logOpcode =
      source === 'ble'
        ? BLEOpcode.LOG_CODE_BLE_VALID_HISTORY
        : source === 'nfc'
          ? BLEOpcode.LOG_EVENT_NFC_OPENING
          : BLEOpcode.LOG_CODE_KEY_VALID_HISTORY;

    this.addLog(logOpcode, [0, 0, 0, 0]);

    this.scheduleAutoClose();
  }

  // Used by SimulatedBluetoothAdapter to consume injected errors
  public _consumeConnectionError(): Error | null {
    const err = this.nextConnectionError;
    this.nextConnectionError = null;
    return err;
  }

  public _consumeDiscoveryError(): Error | null {
    const err = this.nextDiscoveryError;
    this.nextDiscoveryError = null;
    return err;
  }
}
