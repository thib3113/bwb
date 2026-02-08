import { BaseLogPayload } from './BaseLogPayload';

export class KeyOpeningLogPayload extends BaseLogPayload {
  toString(): string {
    return `Key Opening (Age: ${this.age}s)`;
  }
}
