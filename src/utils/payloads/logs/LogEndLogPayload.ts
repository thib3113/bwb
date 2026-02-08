import { BaseLogPayload } from './BaseLogPayload';

export class LogEndLogPayload extends BaseLogPayload {
  toString(): string {
    return `Log End (Age: ${this.age}s)`;
  }
}
