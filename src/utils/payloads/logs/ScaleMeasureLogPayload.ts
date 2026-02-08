import { BaseLogPayload } from './BaseLogPayload';

export class ScaleMeasureLogPayload extends BaseLogPayload {
  get description(): string {
    return 'logs:events.scale_measure';
  }
}
