import { BaseLogPayload } from './BaseLogPayload';

export class DoorOpenLogPayload extends BaseLogPayload {
  toString(): string {
    return `Door Opened Log (Age: ${this.age}s)`;
  }
}
