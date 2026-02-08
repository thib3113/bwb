import { BaseCodeLogPayload } from './BaseCodeLogPayload';

export class BleValidLogPayload extends BaseCodeLogPayload {
  toString(): string {
    return `BLE Valid Code Log (Age: ${this.age}s, Code: ${this.code}, MAC: ${this.macAddress})`;
  }
}
