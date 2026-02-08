import { BaseCodeLogPayload } from './BaseCodeLogPayload';

export class KeyValidLogPayload extends BaseCodeLogPayload {
  toString(): string {
    return `Key Valid Code Log (Age: ${this.age}s, Code: ${this.code})`;
  }
}
