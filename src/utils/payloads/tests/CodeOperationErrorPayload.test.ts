import { describe, expect, it } from 'vitest';
import { CodeOperationErrorPayload } from '../CodeOperationErrorPayload';
import { BLEOpcode } from '../../bleConstants';

describe('CodeOperationErrorPayload', () => {
  it('should parse correctly', () => {
    const instance = new CodeOperationErrorPayload(BLEOpcode.CODE_OPERATION_ERROR, new Uint8Array([]), new Uint8Array());
    expect(instance).toBeDefined();
  });
});
