import { BLEAdapter } from './BLEAdapter';
import {
  BluetoothDevice,
  BluetoothRemoteGATTCharacteristic,
  BluetoothRemoteGATTServer
} from '../../types';

export class WebBluetoothAdapter implements BLEAdapter {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  // Cache characteristics to avoid re-fetching
  private charCache: Map<string, BluetoothRemoteGATTCharacteristic> = new Map();

  isAvailable(): boolean {
    return !!(navigator && navigator.bluetooth);
  }

  async connect(serviceUuid: string, optionalServices: string[]): Promise<BluetoothDevice> {
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [serviceUuid] }],
      optionalServices
    });

    this.device = device as unknown as BluetoothDevice;
    // Note: Disconnect listener should be handled by the consumer via device.addEventListener

    if (!device.gatt) throw new Error('No GATT');
    const server = await device.gatt.connect();
    this.server = server as unknown as BluetoothRemoteGATTServer;
    this.charCache.clear();

    return this.device;
  }

  disconnect(): void {
    if (this.server && this.server.connected) {
      this.server.disconnect();
    }
    this.device = null;
    this.server = null;
    this.charCache.clear();
  }

  getDevice(): BluetoothDevice | null {
    return this.device;
  }

  private async getCharacteristic(serviceUuid: string, charUuid: string) {
    const key = `${serviceUuid}/${charUuid}`;
    if (this.charCache.has(key))
      return this.charCache.get(key) as BluetoothRemoteGATTCharacteristic;

    if (!this.server || !this.server.connected) throw new Error('Device not connected');
    const service = await this.server.getPrimaryService(serviceUuid);
    const char = await service.getCharacteristic(charUuid);

    this.charCache.set(key, char);
    return char;
  }

  async write(
    serviceUuid: string,
    charUuid: string,
    data: Uint8Array,
    withoutResponse: boolean
  ): Promise<void> {
    const char = await this.getCharacteristic(serviceUuid, charUuid);
    if (!char) throw new Error(`Characteristic ${charUuid} not found`);

    if (withoutResponse) {
      // Try optimized write if available
      if (char.writeValueWithoutResponse) {
        await char.writeValueWithoutResponse(data.buffer as ArrayBuffer);
      } else {
        await char.writeValue(data.buffer as ArrayBuffer);
      }
    } else {
      await char.writeValue(data.buffer as ArrayBuffer);
    }
  }

  async read(serviceUuid: string, charUuid: string): Promise<DataView> {
    const char = await this.getCharacteristic(serviceUuid, charUuid);
    if (!char) throw new Error(`Characteristic ${charUuid} not found`);
    return await char.readValue();
  }

  async startNotifications(
    serviceUuid: string,
    charUuid: string,
    callback: (value: DataView) => void
  ): Promise<void> {
    const char = await this.getCharacteristic(serviceUuid, charUuid);
    if (!char) throw new Error(`Characteristic ${charUuid} not found`);
    await char.startNotifications();
    char.addEventListener('characteristicvaluechanged', (event: Event) => {
      const target = event.target as unknown as { value: DataView };
      callback(target.value);
    });
  }

  async stopNotifications(serviceUuid: string, charUuid: string): Promise<void> {
    try {
      const char = await this.getCharacteristic(serviceUuid, charUuid);
      if (char) {
        await char.stopNotifications();
      }
    } catch {
      // Ignore errors on stop
    }
  }
}
