import { EventEmitter } from '../utils/EventEmitter';
import { BLEPacket, parsePacket } from '../utils/packetParser';
import { BLEOpcode, BATTERY_SERVICE_UUID, DEVICE_INFO_SERVICE_UUID } from '../utils/bleConstants';
import { BLECommandOptions } from '../utils/BLEQueue';
import { parsePayload, ParsedPayload } from '../utils/payloadParser';
import { BoksTXPacket } from '../ble/packets/BoksTXPacket';
import { getCharacteristicName, parseCharacteristicValue } from '../utils/bleUtils';

// SDK Imports
import { BoksController, BoksClient, WebBluetoothTransport, BoksPacket } from '@thib3113/boks-sdk';
import { SimulatorTransport, BoksHardwareSimulator } from '@thib3113/boks-sdk/simulator';

// Inline helpers for compatibility
class DescriptionPayload implements ParsedPayload {
  constructor(
    public opcode: number,
    public payload: Uint8Array,
    public raw: Uint8Array,
    private description: string
  ) {}
  toString() {
    return this.description;
  }
  toDetails() {
    return { description: this.description };
  }
}

// Inline GattOperationPacket for logging
class GattOperationPacket extends BoksTXPacket implements ParsedPayload {
  public payload: Uint8Array = new Uint8Array(0);
  public raw: Uint8Array = new Uint8Array(0);

  constructor(
    public uuid: string = '',
    public description: string = ''
  ) {
    super();
  }

  static get opcode() {
    return BLEOpcode.INTERNAL_GATT_OPERATION;
  }

  toString(): string {
    return this.description || `GATT Op: ${this.uuid}`;
  }

  toDetails(): Record<string, unknown> {
    return { uuid: this.uuid, description: this.description };
  }

  toPayload(): Uint8Array {
      return new Uint8Array(0); // Not used for actual sending
  }

  parse(payload: Uint8Array): void {
      this.payload = payload;
      // No-op for logging packet
  }
}

export enum BLEServiceEvent {
  STATE_CHANGED = 'state_changed',
  PACKET_RECEIVED = 'packet_received',
  PACKET_SENT = 'packet_sent',
  ERROR = 'error',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected'
}

export type BLEServiceState =
  | 'disconnected'
  | 'scanning'
  | 'connecting'
  | 'connected'
  | 'disconnecting';

interface BoksWindow extends Window {
  BOKS_SIMULATOR_ENABLED?: boolean;
  BOKS_SIMULATOR_DISABLED?: boolean;
  toggleSimulator?: (enable: boolean) => void;
}

export class BoksBLEService extends EventEmitter {
  private static instance: BoksBLEService;

  public controller!: BoksController;
  public client!: BoksClient; // Exposed for direct transport access if needed

  private state: BLEServiceState = 'disconnected';
  private lastSentOpcode: number | null = null;
  private unsubscribePacketListener: (() => void) | null = null;

  private constructor() {
    super();
    this.initializeController();
  }

  private initializeController() {
    let useSimulator = false;

    // 1. Check build-time constant (CI mode)
    if (typeof __BOKS_SIMULATOR_AUTO_ENABLE__ !== 'undefined' && __BOKS_SIMULATOR_AUTO_ENABLE__) {
      useSimulator = true;
    }
    // 2. Fallback to runtime flags
    else if (typeof window !== 'undefined') {
      const win = window as unknown as BoksWindow;
      if (win.BOKS_SIMULATOR_DISABLED === true) {
        useSimulator = false;
      } else {
        useSimulator =
          win.BOKS_SIMULATOR_ENABLED === true ||
          localStorage.getItem('BOKS_SIMULATOR_ENABLED') === 'true';
      }
    }

    if (useSimulator) {
      console.warn('⚠️ BoksBLEService: Initializing with SimulatorTransport ⚠️');
      const simulator = new BoksHardwareSimulator();
      // Expose for debugging/tests
      (window as any).boksSimulator = simulator;

      const transport = new SimulatorTransport(simulator);
      this.client = new BoksClient({ transport });
    } else {
      this.client = new BoksClient({ transport: new WebBluetoothTransport() });
    }

    this.controller = new BoksController(this.client);
    this.setupListeners();
  }

  private setupListeners() {
    // Clean up previous listener if any
    if (this.unsubscribePacketListener) {
      this.unsubscribePacketListener();
    }

    // Subscribe to all packets via controller
    this.unsubscribePacketListener = this.controller.onPacket((packet: BoksPacket) => {
        // SDK BoksPacket has .opcode
        // It should have .toPayload() or similar based on abstraction
        // If we want raw bytes, we can try .encode() if it's available on RX packets too?
        // Usually encode is for TX. But let's assume we can get payload.
        // If not, we fall back to empty or inspect if it's exposed as property.

        let payload = new Uint8Array(0) as Uint8Array;
        let raw = new Uint8Array(0) as Uint8Array;

        try {
            // Attempt to get payload
            if ('toPayload' in packet && typeof packet.toPayload === 'function') {
                payload = packet.toPayload();
            } else if ('payload' in packet) {
                payload = (packet as any).payload;
            }

            // Attempt to get raw (full packet)
             if ('encode' in packet && typeof packet.encode === 'function') {
                raw = packet.encode();
            } else if ('raw' in packet) {
                raw = (packet as any).raw;
            }
        } catch (e) {
            console.warn('Failed to extract payload from SDK packet', e);
        }

        const blePacket: BLEPacket = {
            opcode: packet.opcode,
            payload: payload,
            raw: raw,
            direction: 'RX',
            isValidChecksum: true,
            parsedPayload: parsePayload(packet.opcode, payload, raw)
        };

        this.emit(BLEServiceEvent.PACKET_RECEIVED, blePacket, this.lastSentOpcode);
        this.emit(`opcode_${packet.opcode}`, blePacket, this.lastSentOpcode);
    });
  }

  /**
   * Re-initializes the controller with the specified transport mode.
   */
  setSimulatorMode(enabled: boolean) {
     if (this.state !== 'disconnected') {
      console.warn('Changing adapter while connected is risky. Disconnecting first.');
      this.disconnect();
    }

    if (typeof window !== 'undefined') {
        const win = window as unknown as BoksWindow;
        win.BOKS_SIMULATOR_ENABLED = enabled;
        localStorage.setItem('BOKS_SIMULATOR_ENABLED', String(enabled));
    }

    if (enabled) {
      console.warn('⚠️ Switching to SimulatorTransport ⚠️');
      const simulator = new BoksHardwareSimulator();
      // Expose for debugging/tests
      (window as any).boksSimulator = simulator;

      const transport = new SimulatorTransport(simulator);
      this.client = new BoksClient({ transport });
    } else {
      console.log('✅ Switching to WebBluetoothTransport');
      this.client = new BoksClient({ transport: new WebBluetoothTransport() });
    }
    this.controller = new BoksController(this.client);
    this.setupListeners();
  }

  static getInstance(): BoksBLEService {
    if (!BoksBLEService.instance) {
      BoksBLEService.instance = new BoksBLEService();
    }
    return BoksBLEService.instance;
  }

  getState(): BLEServiceState {
    return this.state;
  }

  private setState(newState: BLEServiceState) {
    this.state = newState;
    this.emit(BLEServiceEvent.STATE_CHANGED, newState);
  }

  async connect(customServices: string[] = []): Promise<void> {
    if (this.state === 'connected' || this.state === 'connecting') return;

    try {
      this.setState('scanning');
      // SDK's connect handles scanning/connecting
      await this.controller.connect();
      this.setState('connected');

      const transport = (this.client as any).transport;
      const device = transport?.device || { id: 'unknown', name: 'Boks Device' };

      this.emit(BLEServiceEvent.CONNECTED, device);

    } catch (error) {
      this.setState('disconnected');
      this.emit(BLEServiceEvent.ERROR, error);
      throw error;
    }
  }

  disconnect() {
    this.setState('disconnecting');
    this.controller.disconnect().finally(() => {
        this.setState('disconnected');
        this.emit(BLEServiceEvent.DISCONNECTED);
    });
  }

  /**
   * Sends a request to the device.
   * COMPATIBILITY LAYER: Uses raw transport write.
   */
  async sendRequest(
    request: BoksTXPacket,
    options?: BLECommandOptions,
    configKey?: string
  ): Promise<BLEPacket | BLEPacket[]> {
    if (this.state !== 'connected') {
      throw new Error(`[BLEService] Cannot send request: Service state is ${this.state}`);
    }

    if ('toPacket' in request && typeof request.toPacket === 'function') {
      const packetBytes = request.toPacket();
      this.lastSentOpcode = request.opcode;

      // Emit TX event for logging
      const parsed = parsePacket(new DataView(packetBytes.buffer));
      if (parsed) {
        parsed.direction = 'TX';
        this.emit(BLEServiceEvent.PACKET_SENT, parsed);
      }

      const transport = (this.client as any).transport;
      if (transport && typeof transport.write === 'function') {
          await transport.write(packetBytes);
      } else {
          throw new Error('Transport does not support write or is unavailable');
      }

      if (options?.expectResponse !== false) {
         return new Promise<BLEPacket>((resolve, reject) => {
             const timeout = setTimeout(() => {
                 cleanup();
                 reject(new Error(`Timeout waiting for opcode response`));
             }, options?.timeout || 5000);

             const listener = (arg: unknown) => {
                 const packet = arg as BLEPacket;
                 cleanup();
                 resolve(packet);
             };

             const cleanup = () => {
                 clearTimeout(timeout);
                 this.off(BLEServiceEvent.PACKET_RECEIVED, listener);
             };

             this.on(BLEServiceEvent.PACKET_RECEIVED, listener);
         });
      }

      return {} as BLEPacket;
    } else {
      throw new Error('[BLEService] sendRequest requires a valid BoksTXPacket instance.');
    }
  }

  async readCharacteristic(serviceUuid: string, charUuid: string): Promise<DataView> {
    const charName = getCharacteristicName(charUuid);
    const logPacket = new GattOperationPacket(charUuid, `Read: ${charName}`);
    const uuidBytes = new TextEncoder().encode(charUuid);
    const rawTx = new Uint8Array([BLEOpcode.INTERNAL_GATT_OPERATION, ...uuidBytes]);

    this.emit(BLEServiceEvent.PACKET_SENT, {
      opcode: BLEOpcode.INTERNAL_GATT_OPERATION,
      payload: uuidBytes,
      raw: rawTx,
      direction: 'TX',
      isValidChecksum: true,
      uuid: charUuid,
      parsedPayload: logPacket
    } as BLEPacket);

    try {
      const transport = (this.client as any).transport;
      // Note: WebBluetoothTransport.read(uuid) uses that uuid to find the characteristic.
      // It assumes the characteristic is available in the connected service(s).
      const value = await transport.read(charUuid);

      const valueDataView = new DataView(value.buffer, value.byteOffset, value.byteLength);
      const parsedValue = parseCharacteristicValue(charUuid, valueDataView);

      const rawBytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
      this.emit(
        BLEServiceEvent.PACKET_RECEIVED,
        {
          opcode: BLEOpcode.INTERNAL_GATT_OPERATION,
          payload: rawBytes,
          raw: new Uint8Array([BLEOpcode.INTERNAL_GATT_OPERATION, ...rawBytes]),
          direction: 'RX',
          isValidChecksum: true,
          uuid: charUuid,
          parsedPayload: new DescriptionPayload(
            BLEOpcode.INTERNAL_GATT_OPERATION,
            rawBytes,
            new Uint8Array(0),
            parsedValue
          )
        } as BLEPacket,
        BLEOpcode.INTERNAL_GATT_OPERATION
      );

      return valueDataView;
    } catch (error) {
      console.error(`[BLEService] Error reading characteristic ${charUuid}:`, error);
      throw error;
    }
  }

  getDevice() {
     return (this.client as any).transport?.device || null;
  }
}
