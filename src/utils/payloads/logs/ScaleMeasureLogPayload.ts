import { BaseLogPayload } from './BaseLogPayload';

export class ScaleMeasureLogPayload extends BaseLogPayload {
  toString(): string {
    return `Scale Measure (Age: ${this.age}s)`;
  }
}
