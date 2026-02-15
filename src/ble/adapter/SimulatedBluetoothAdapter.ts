import { BLEAdapter } from './BLEAdapter';
import { BluetoothDevice } from '../../types';
import { BoksSimulator } from '../simulator/BoksSimulator';
import {
  BATTERY_LEVEL_CHAR_UUID,
  BATTERY_SERVICE_UUID,
  BLEOpcode,
  DEVICE_INFO_CHARS,
  DEVICE_INFO_SERVICE_UUID,
  SIMULATOR_BLE_ID
} from '../../utils/bleConstants';

class MockBluetoothDevice implements BluetoothDevice {
  public id = SIMULATOR_BLE_ID;
  public name = SIMULATOR_BLE_ID;
  public gatt = {
    connected: true,
    connect: async () => this.gatt,
    disconnect: () => {
      // Handled by adapter
    },
    device: this
  } as unknown as BluetoothRemoteGATTServer;

  public watchingAdvertisements = false;
  private listeners: Map<string, Set<EventListenerOrEventListenerObject>> = new Map();

  async watchAdvertisements() {
    this.watchingAdvertisements = true;
  }
  async unwatchAdvertisements() {
    this.watchingAdvertisements = false;
  }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    const set = this.listeners.get(type);
    if (set) {
      set.delete(listener);
    }
  }

  dispatchEvent(event: Event) {
    const set = this.listeners.get(event.type);
    if (set) {
      set.forEach(l => {
         if (typeof l === 'function') {
           l(event);
         } else if (l && typeof l.handleEvent === 'function') {
           l.handleEvent(event);
         }
      });
    }
    return true;
  }
}

export class SimulatedBluetoothAdapter implements BLEAdapter {
  private simulator: BoksSimulator;
  private isConnected: boolean = false;
  private notificationCallback: ((value: DataView) => void) | null = null;
  private currentDevice: MockBluetoothDevice | null = null;

  constructor() {
    this.simulator = BoksSimulator.getInstance();

    // Pipe simulator notifications to the callback
    this.simulator.on('notification', (rawPacket: unknown) => {
      if (this.notificationCallback && this.isConnected && rawPacket instanceof Uint8Array) {
        this.notificationCallback(new DataView(rawPacket.buffer));
      }
    });

    // Handle Forced Disconnection from Simulator
    this.simulator.on('disconnect-event', () => {
      // We only simulate disconnect if we are actually connected
      if (this.isConnected && this.currentDevice) {
        console.warn('[SimulatedAdapter] Simulator forced disconnection');
        this.isConnected = false;

        // Create the event properly
        const event = new Event('gattserverdisconnected');
        // Dispatch to the device object so listeners (like BoksBLEService) catch it
        this.currentDevice.dispatchEvent(event);

        this.currentDevice = null;
      }
    });

    // Handle RSSI updates
    this.simulator.on('rssi-update', (rssi: number) => {
      if (this.currentDevice && this.currentDevice.watchingAdvertisements) {
         // Dispatch advertisementreceived event
         // Note: We use a custom event structure that mimics BluetoothAdvertisingEvent
         // but since we can't easily import that class in all envs, we mock it.
         // Listeners usually access event.rssi

         const event = new Event('advertisementreceived');
         Object.defineProperty(event, 'rssi', { value: rssi, writable: false });
         Object.defineProperty(event, 'device', { value: this.currentDevice, writable: false });

         this.currentDevice.dispatchEvent(event);
      }
    });
  }

  isAvailable(): boolean {
    return true; // Always available
  }

  async connect(): Promise<BluetoothDevice> {
    console.log('[SimulatedAdapter] Connecting...');

    // Simulate Discovery Failure
    const discErr = this.simulator._consumeDiscoveryError();
    if (discErr) {
      console.warn('[SimulatedAdapter] Faking Discovery Failure:', discErr.message);
      throw discErr;
    }

    await new Promise((resolve) => setTimeout(resolve, 800)); // Fake delay

    // Simulate Connection Failure
    const connErr = this.simulator._consumeConnectionError();
    if (connErr) {
      console.warn('[SimulatedAdapter] Faking Connection Failure:', connErr.message);
      throw connErr;
    }

    this.isConnected = true;
    this.currentDevice = new MockBluetoothDevice();

    // Simulate spontaneous notifications after connection
    setTimeout(() => {
      // Fetch actual counts from simulator state
      const state = this.simulator.getPublicState();
      let masterCount = 0;
      let singleCount = 0;
      for (const type of state.pinCodes.values()) {
        if (type === 'master') masterCount++;
        else if (type === 'single') singleCount++;
      }

      // Code Count: Big Endian [MasterMSB, MasterLSB, SingleMSB, SingleLSB].
      this.simulator['sendNotification'](BLEOpcode.NOTIFY_CODES_COUNT, [
        (masterCount >> 8) & 0XFF,
        masterCount & 0XFF,
        (singleCount >> 8) & 0XFF,
        singleCount & 0XFF
      ]);
    }, 500);

    return this.currentDevice;
  }

  disconnect(): void {
    console.log('[SimulatedAdapter] Disconnecting...');
    this.isConnected = false;
    this.notificationCallback = null;
    this.currentDevice = null;
  }

  getDevice(): BluetoothDevice | null {
    if (!this.isConnected) return null;
    return this.currentDevice;
  }

  async write(_serviceUuid: string, _charUuid: string, data: Uint8Array): Promise<void> {
    if (!this.isConnected) {
      console.error('[SimulatedAdapter] Write failed: Not connected', {
        opcode: data[0],
        length: data[1]
      });
      throw new Error('Simulator not connected');
    }

    if (data.length < 2) return; // Invalid
    const opcode = data[0];
    const len = data[1];
    const payload = data.slice(2, 2 + len);

    // Emit event for tests to verify what the App is sending (TX)
    if (typeof window !== 'undefined') {
      const detail = {
        opcode,
        payload: Array.from(payload)
      };

      // 1. Dispatch standard event
      globalThis.window.dispatchEvent(new CustomEvent('boks-tx', { detail }));

      // 2. Also push to a global buffer for cases where the listener isn't ready yet
      globalThis.window._boks_tx_buffer = globalThis.window._boks_tx_buffer || [];
      globalThis.window._boks_tx_buffer.push(detail);

      // Keep it synchronized with txEvents if fixtures already set it up
      if (globalThis.window.txEvents) {
        globalThis.window.txEvents.push(detail);
      }
    }

    // Pass to simulator (which handles packet loss and custom handlers)
    this.simulator.handlePacket(opcode, payload);
  }

  async read(serviceUuid: string, charUuid: string): Promise<DataView> {
    if (!this.isConnected) throw new Error('Simulator not connected');

    const state = this.simulator.getPublicState();

    // 1. Battery Service
    if (serviceUuid === BATTERY_SERVICE_UUID && charUuid === BATTERY_LEVEL_CHAR_UUID) {
      const buffer = new Uint8Array([state.batteryLevel]);
      return new DataView(buffer.buffer);
    }

    // 2. Device Info Service
    if (serviceUuid === DEVICE_INFO_SERVICE_UUID) {
      const encoder = new TextEncoder();
      if (charUuid === DEVICE_INFO_CHARS['Firmware Revision']) {
        // HW Version
        const data = encoder.encode(state.firmwareRevision);
        return new DataView(data.buffer);
      }
      if (charUuid === DEVICE_INFO_CHARS['Software Revision']) {
        // SW Version
        const data = encoder.encode(state.softwareRevision);
        return new DataView(data.buffer);
      }
      if (charUuid === DEVICE_INFO_CHARS['Manufacturer Name']) {
        const data = encoder.encode('Boks');
        return new DataView(data.buffer);
      }
      if (charUuid === DEVICE_INFO_CHARS['Model Number']) {
        const data = encoder.encode('2.0');
        return new DataView(data.buffer);
      }
    }

    // Default Fallback
    const buffer = new Uint8Array([0]);
    return new DataView(buffer.buffer);
  }

  async startNotifications(
    _serviceUuid: string,
    _charUuid: string,
    callback: (value: DataView) => void
  ): Promise<void> {
    this.notificationCallback = callback;
  }

  async stopNotifications(): Promise<void> {
    this.notificationCallback = null;
  }
}
