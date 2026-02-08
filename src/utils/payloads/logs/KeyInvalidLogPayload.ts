import { BaseCodeLogPayload } from './BaseCodeLogPayload';

export class KeyInvalidLogPayload extends BaseCodeLogPayload {
  toString(): string {
    return `Key Invalid Code Log (Age: ${this.age}s, Code: ${this.code})`;
  }
}
