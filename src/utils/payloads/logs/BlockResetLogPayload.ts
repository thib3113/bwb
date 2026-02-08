import { BaseLogPayload } from './BaseLogPayload';

export class BlockResetLogPayload extends BaseLogPayload {
  toString(): string {
    return `Block Reset (Age: ${this.age}s)`;
  }
}
