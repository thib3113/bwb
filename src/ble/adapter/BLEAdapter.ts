import { BluetoothDevice } from '../../types';

export interface BLEAdapter {
  isAvailable(): boolean;
  connect(serviceUuid: string, optionalServices: string[]): Promise<BluetoothDevice>;
  disconnect(): void;
  getDevice(): BluetoothDevice | null;

  // Primitives
  write(
    serviceUuid: string,
    charUuid: string,
    data: Uint8Array,
    withoutResponse: boolean
  ): Promise<void>;
  read(serviceUuid: string, charUuid: string): Promise<DataView>;
  startNotifications(
    serviceUuid: string,
    charUuid: string,
    callback: (value: DataView) => void
  ): Promise<void>;
  stopNotifications(serviceUuid: string, charUuid: string): Promise<void>;
}
