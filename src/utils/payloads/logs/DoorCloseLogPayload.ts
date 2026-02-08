import { BaseLogPayload } from './BaseLogPayload';

export class DoorCloseLogPayload extends BaseLogPayload {
  toString(): string {
    return `Door Closed Log (Age: ${this.age}s)`;
  }
}
