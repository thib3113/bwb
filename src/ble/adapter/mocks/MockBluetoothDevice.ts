import { BluetoothDevice, BluetoothRemoteGATTServer, BluetoothServiceUUID } from '../../../types';
import { SIMULATOR_BLE_ID } from '../../../utils/bleConstants';

/**
 * A mock implementation of the Web Bluetooth API's BluetoothDevice interface.
 * used by the SimulatedBluetoothAdapter to provide a realistic object to the application.
 */
export class MockBluetoothDevice implements BluetoothDevice {
  public id = SIMULATOR_BLE_ID;
  public name = SIMULATOR_BLE_ID;

  public gatt: BluetoothRemoteGATTServer = {
    connected: true,
    connect: async () => this.gatt!,
    disconnect: () => {
      // Disconnection logic is handled by the adapter via event listeners
    },
    device: this,
    getPrimaryService: async (service: BluetoothServiceUUID) => {
      throw new Error(`Mock: getPrimaryService(${service}) not implemented`);
    },
    getPrimaryServices: async (service?: BluetoothServiceUUID) => {
      throw new Error(`Mock: getPrimaryServices(${service}) not implemented`);
    }
  };

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

  /**
   * Internal method to dispatch events to listeners.
   * Mimics the EventTarget.dispatchEvent behavior.
   */
  dispatchEvent(event: Event): boolean {
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
    return true; // Event not canceled
  }
}
