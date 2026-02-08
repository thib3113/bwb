import { describe, expect, it } from 'vitest';
import { ScaleMeasureLogPayload } from '../logs/ScaleMeasureLogPayload';
import { BLEOpcode } from '../../bleConstants';

describe('ScaleMeasureLogPayload', () => {
  it('should parse correctly', () => {
    const instance = new ScaleMeasureLogPayload(BLEOpcode.LOG_EVENT_SCALE_MEASURE, new Uint8Array([0, 0, 0]), new Uint8Array());
    expect(instance).toBeDefined();
  });
});
