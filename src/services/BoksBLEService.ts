import { EventEmitter } from '../utils/EventEmitter';
import { BLEPacket, createPacket, parsePacket } from '../utils/packetParser';
import {
  BATTERY_SERVICE_UUID,
  BLEOpcode,
  DEVICE_INFO_SERVICE_UUID,
  NOTIFY_CHAR_UUID,
  SERVICE_UUID,
  WRITE_CHAR_UUID
} from '../utils/bleConstants';
import { BLECommandOptions, BLEQueue } from '../utils/BLEQueue';
import { ParsedPayload, parsePayload } from '../utils/payloadParser';
import { BoksTXPacket } from '../ble/packets/BoksTXPacket';
import { BLEAdapter } from '../ble/adapter/BLEAdapter';
import { WebBluetoothAdapter } from '../ble/adapter/WebBluetoothAdapter';
import { SimulatedBluetoothAdapter } from '../ble/adapter/SimulatedBluetoothAdapter';
import { GattOperationPacket } from '../ble/packets/GattOperationPacket';
import { getCharacteristicName, parseCharacteristicValue } from '../utils/bleUtils';

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

// Type safe access to global test flags
interface BoksWindow extends Window {
  BOKS_SIMULATOR_ENABLED?: boolean;
  BOKS_SIMULATOR_DISABLED?: boolean;
}

export class BoksBLEService extends EventEmitter {
  private static instance: BoksBLEService;

  private adapter: BLEAdapter; // The pluggable transport layer

  private state: BLEServiceState = 'disconnected';
  private queue: BLEQueue;
  private lastSentOpcode: number | null = null;
  private lastSentTimestamp: number = 0;

  private constructor() {
    super();

    // Check for simulator flag early to avoid real Bluetooth prompts in tests
    let useSimulator = false;

    // 1. Check build-time constant (CI mode)
    if (typeof __BOKS_SIMULATOR_AUTO_ENABLE__ !== 'undefined' && __BOKS_SIMULATOR_AUTO_ENABLE__) {
      useSimulator = true;
    }
    // 2. Fallback to runtime flags
    else if (typeof window !== 'undefined') {
      const win = window as unknown as BoksWindow;
      
      // DISABLED flag has priority (for E2E resilience tests)
      if (win.BOKS_SIMULATOR_DISABLED === true) {
        useSimulator = false;
      } else {
        useSimulator =
          win.BOKS_SIMULATOR_ENABLED === true ||
          localStorage.getItem('BOKS_SIMULATOR_ENABLED') === 'true';
      }
    }

    if (useSimulator) {
      console.warn('⚠️ BoksBLEService: Initializing with SimulatedAdapter ⚠️');
      this.adapter = new SimulatedBluetoothAdapter();
    } else {
      this.adapter = new WebBluetoothAdapter();
    }

    this.queue = new BLEQueue(async (request) => {
      this.lastSentOpcode = request.opcode;
      this.lastSentTimestamp = Date.now();

      // Prevent sending invalid opcodes (Safety Guard)
      if ((request.opcode as number) === 0) {
        throw new Error('[BLEService] Attempted to send packet with Opcode 0x00 (UNPARSABLE).');
      }

      // Packet creation
      let packet: Uint8Array;

      // Use pre-calculated packet if available (from BoksTXPacket.toPacket())
      if (request.packet) {
        packet = request.packet;
      } else {
        // Fallback for raw requests
        packet = createPacket(request.opcode, request.payload);
      }
      const buffer = packet;

      // Notify about sending (UI logs)
      const parsed = parsePacket(new DataView(packet.buffer));
      if (parsed) {
        parsed.direction = 'TX';
        this.emit(BLEServiceEvent.PACKET_SENT, parsed);
      }

      // Delegate the actual write to the adapter
      await this.adapter.write(SERVICE_UUID, WRITE_CHAR_UUID, buffer, true);
    });
  }

  /**
   * Inject a specific adapter (e.g., Simulator)
   */
  setAdapter(adapter: BLEAdapter) {
    if (this.state !== 'disconnected') {
      console.warn('Changing adapter while connected is risky. Disconnecting first.');
      this.disconnect();
    }
    this.adapter = adapter;
  }

  getLastSentOpcode(): number | null {
    return this.lastSentOpcode;
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

      const optionalServices = [BATTERY_SERVICE_UUID, DEVICE_INFO_SERVICE_UUID, ...customServices];

      const device = await this.adapter.connect(SERVICE_UUID, optionalServices);

      this.setState('connecting');

      // Setup disconnect listener (requires device reference from adapter)
      if (device && device.addEventListener) {
        device.addEventListener('gattserverdisconnected', () => this.handleDisconnect());
      }

      // Subscribe to notifications via adapter
      await this.adapter.startNotifications(SERVICE_UUID, NOTIFY_CHAR_UUID, (data) => {
        this.handleNotification(data);
      });

      this.setState('connected');
      this.emit(BLEServiceEvent.CONNECTED, device);
    } catch (error) {
      this.setState('disconnected');
      this.emit(BLEServiceEvent.ERROR, error);
      throw error;
    }
  }

  disconnect() {
    this.setState('disconnecting');
    this.adapter.disconnect();
    this.handleDisconnect();
  }

  private handleDisconnect() {
    this.queue.clear();
    this.setState('disconnected');
    this.emit(BLEServiceEvent.DISCONNECTED);
  }

  private handleNotification(data: DataView) {
    const rawBytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    const hexRaw = Array.from(rawBytes)
      .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
      .join(' ');

    const parsed = parsePacket(data);
    const lastOp = this.lastSentOpcode;

    if (parsed) {
      parsed.direction = 'RX';
      // Use our new payload parser for rich objects
      parsed.parsedPayload = parsePayload(parsed.opcode, parsed.payload, parsed.raw);

      // 1. Process the queue FIRST to resolve promises
      this.queue.handleResponse(parsed);

      // 2. Fire the global event
      this.emit(BLEServiceEvent.PACKET_RECEIVED, parsed, lastOp);

      // 3. Fire opcode-specific event
      this.emit(`opcode_${parsed.opcode}`, parsed, lastOp);
    } else {
      console.warn(`[BLEService] RX UNPARSABLE: ${hexRaw}`);
      this.emit(
        BLEServiceEvent.PACKET_RECEIVED,
        {
          opcode: 0,
          payload: new Uint8Array(0),
          raw: rawBytes,
          direction: 'RX',
          isValidChecksum: false
        } as BLEPacket,
        lastOp
      );
    }
  }

  /**
   * Sends a request to the device.
   * @param request The packet object (recommended) or raw opcode/payload.
   * @param options Command options.
   * @param configKey Configuration key for authenticated commands. Only used if request is a BoksTXPacket.
   */
  async sendRequest(
    request: BoksTXPacket,
    options?: BLECommandOptions,
    configKey?: string
  ): Promise<BLEPacket | BLEPacket[]> {
    if (this.state !== 'connected') {
      throw new Error(`[BLEService] Cannot send request: Service state is ${this.state}`);
    }

    // Strict enforcing of BoksTXPacket
    // We check for toPacket method existence to support different instances/prototypes in HMR
    if ('toPacket' in request && typeof request.toPacket === 'function') {
      // Calculate packet bytes using the class method (includes opcode check and checksum)
      const packetBytes = request.toPacket();

      // Pass the opcode and payload (legacy support for logging/queue) AND the full binary
      return this.queue.add(request.opcode, request.toPayload(configKey), options, packetBytes);
    } else {
      throw new Error('[BLEService] sendRequest requires a valid BoksTXPacket instance.');
    }
  }

  async readCharacteristic(serviceUuid: string, charUuid: string): Promise<DataView> {
    const charName = getCharacteristicName(charUuid);

    // Use GattOperationPacket for structured logging
    // TX: "Read: Firmware Revision"
    const logPacket = new GattOperationPacket(charUuid, `Read: ${charName}`);

    // We construct the "fake" TX packet to emit
    const uuidBytes = new TextEncoder().encode(charUuid); // Full UUID for consistency
    const rawTx = new Uint8Array([BLEOpcode.INTERNAL_GATT_OPERATION, ...uuidBytes]);

    this.emit(BLEServiceEvent.PACKET_SENT, {
      opcode: BLEOpcode.INTERNAL_GATT_OPERATION,
      payload: uuidBytes,
      raw: rawTx,
      direction: 'TX',
      isValidChecksum: true,
      uuid: charUuid,
      parsedPayload: logPacket // Attach the packet object as payload info
    } as BLEPacket);

    try {
      const value = await this.adapter.read(serviceUuid, charUuid);

      const parsedValue = parseCharacteristicValue(charUuid, value);

      // Fake RX packet for logs
      // RX: "Value: 4.0"
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
            parsedValue // Display the parsed value directly
          )
        } as BLEPacket,
        BLEOpcode.INTERNAL_GATT_OPERATION
      );
      return value;
    } catch (error) {
      console.error(`[BLEService] Error reading characteristic ${charUuid}:`, error);
      throw error;
    }
  }

  getDevice() {
    return this.adapter.getDevice();
  }
}
