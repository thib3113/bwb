import { BaseCodeLogPayload } from './BaseCodeLogPayload';

export class BleInvalidLogPayload extends BaseCodeLogPayload {
  toString(): string {
    return `BLE Invalid Code Log (Age: ${this.age}s, Code: ${this.code}, MAC: ${this.macAddress})`;
  }
}
