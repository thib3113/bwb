import { BLEAdapter } from './BLEAdapter';
import { BluetoothDevice } from '../../types';
import { BoksSimulator } from '../simulator/BoksSimulator';
import { BLEOpcode, SIMULATOR_BLE_ID } from '../../utils/bleConstants';

export class SimulatedBluetoothAdapter implements BLEAdapter {
  private simulator: BoksSimulator;
  private isConnected: boolean = false;
  private notificationCallback: ((value: DataView) => void) | null = null;

  constructor() {
    this.simulator = new BoksSimulator();
    // Pipe simulator notifications to the callback
    this.simulator.on('notification', (rawPacket: Uint8Array) => {
      if (this.notificationCallback && this.isConnected) {
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
      // Code Count
      this.simulator['sendNotification'](BLEOpcode.NOTIFY_CODES_COUNT, [1, 0, 0, 0]);
    }, 500);

    return {
      id: SIMULATOR_BLE_ID,
      name: SIMULATOR_BLE_ID,
      gatt: { connected: true },
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
      gatt: { connected: true },
    } as unknown as BluetoothDevice;
  }

  async write(_serviceUuid: string, _charUuid: string, data: Uint8Array): Promise<void> {
    if (!this.isConnected) throw new Error('Simulator not connected');

    // Check packet structure [Opcode, Len, ...Payload, Checksum]
    // Simulator expects [Opcode, ...Payload] effectively, or handles the raw packet.
    // Our BoksSimulator.handlePacket takes (opcode, payload).
    // Let's decode the standard packet structure here.

    if (data.length < 2) return; // Invalid
    const opcode = data[0];
    const len = data[1];
    const payload = data.slice(2, 2 + len);

    // Pass to simulator
    this.simulator.handlePacket(opcode, payload);
  }

  async read(): Promise<DataView> {
    if (!this.isConnected) throw new Error('Simulator not connected');

    // Return fake data depending on UUID
    // Example: Battery Level 50%
    const buffer = new Uint8Array([50]);
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
