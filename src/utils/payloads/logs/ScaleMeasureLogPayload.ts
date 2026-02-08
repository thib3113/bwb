import { BLEOpcode } from '../../bleConstants';
import { BaseLogPayload } from './BaseLogPayload';

export class ScaleMeasureLogPayload extends BaseLogPayload {
  static OPCODES = [BLEOpcode.LOG_EVENT_SCALE_MEASURE];
  get description(): string {
    return 'logs:events.scale_measure';
  }
}
