import { BaseLogPayload } from './BaseLogPayload';

export class LogEraseLogPayload extends BaseLogPayload {
  toString(): string {
    return `Log Erased (Age: ${this.age}s)`;
  }
}
