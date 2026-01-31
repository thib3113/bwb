import {BLEAdapter} from './BLEAdapter';
import {BluetoothDevice, BluetoothRemoteGATTServer} from '../../types';

export class WebBluetoothAdapter implements BLEAdapter {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  // Cache characteristics to avoid re-fetching
  private charCache: Map<string, any> = new Map();

  isAvailable(): boolean {
    return !!(navigator && (navigator as any).bluetooth);
  }

  async connect(serviceUuid: string, optionalServices: string[]): Promise<BluetoothDevice> {
    // @ts-expect-error - navigator.bluetooth
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [serviceUuid] }],
      optionalServices,
    });

    this.device = device;
    // Note: Disconnect listener should be handled by the consumer via device.addEventListener

    const server = await device.gatt.connect();
    this.server = server;
    this.charCache.clear();

    return device;
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
    if (this.charCache.has(key)) return this.charCache.get(key);

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
    if (withoutResponse) {
      // Try optimized write if available
      if (char.writeValueWithoutResponse) {
        await char.writeValueWithoutResponse(data);
      } else {
        await char.writeValue(data);
      }
    } else {
      await char.writeValue(data);
    }
  }

  async read(serviceUuid: string, charUuid: string): Promise<DataView> {
    const char = await this.getCharacteristic(serviceUuid, charUuid);
    return await char.readValue();
  }

  async startNotifications(
    serviceUuid: string,
    charUuid: string,
    callback: (value: DataView) => void
  ): Promise<void> {
    const char = await this.getCharacteristic(serviceUuid, charUuid);
    await char.startNotifications();
    char.addEventListener('characteristicvaluechanged', (event: any) => {
      callback(event.target.value);
    });
  }

  async stopNotifications(serviceUuid: string, charUuid: string): Promise<void> {
    try {
      const char = await this.getCharacteristic(serviceUuid, charUuid);
      await char.stopNotifications();
    } catch {
      // Ignore errors on stop
    }
  }
}
