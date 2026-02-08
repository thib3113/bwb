import { BaseLogPayload } from './BaseLogPayload';

export class BleRebootLogPayload extends BaseLogPayload {
  toString(): string {
    return `BLE Reboot (Age: ${this.age}s)`;
  }
}
