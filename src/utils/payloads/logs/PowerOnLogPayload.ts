import { BaseLogPayload } from './BaseLogPayload';

export class PowerOnLogPayload extends BaseLogPayload {
  toString(): string {
    return `Power On (Age: ${this.age}s)`;
  }
}
