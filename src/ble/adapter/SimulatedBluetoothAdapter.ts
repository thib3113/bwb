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

export class SimulatedBluetoothAdapter implements BLEAdapter {
  private simulator: BoksSimulator;
  private isConnected: boolean = false;
  private notificationCallback: ((value: DataView) => void) | null = null;

  constructor() {
    this.simulator = BoksSimulator.getInstance();
    if (typeof window !== "undefined") {
      window.boksSimulator = this.simulator;
    }
    // Pipe simulator notifications to the callback
    this.simulator.on('notification', (rawPacket: unknown) => {
      if (this.notificationCallback && this.isConnected && rawPacket instanceof Uint8Array) {
        this.notificationCallback(new DataView(rawPacket.buffer));
      }
    });
  }

  isAvailable(): boolean {
    return true; // Always available
  }

  async connect(): Promise<BluetoothDevice> {
    console.log('[SimulatedAdapter] Connecting...');
    await new Promise((resolve) => setTimeout(resolve, 800)); // Fake delay

    this.isConnected = true;

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

    return {
      id: SIMULATOR_BLE_ID,
      name: SIMULATOR_BLE_ID,
      gatt: { connected: true }
    } as unknown as BluetoothDevice;
  }

  disconnect(): void {
    console.log('[SimulatedAdapter] Disconnecting...');
    this.isConnected = false;
    this.notificationCallback = null;
  }

  getDevice(): BluetoothDevice | null {
    if (!this.isConnected) return null;
    return {
      id: SIMULATOR_BLE_ID,
      name: SIMULATOR_BLE_ID,
      gatt: { connected: true }
    } as unknown as BluetoothDevice;
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

    // Pass to simulator
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
