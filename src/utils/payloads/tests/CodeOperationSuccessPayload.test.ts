import { describe, expect, it } from 'vitest';
import { CodeOperationSuccessPayload } from '../CodeOperationSuccessPayload';
import { BLEOpcode } from '../../bleConstants';

describe('CodeOperationSuccessPayload', () => {
  it('should parse correctly', () => {
    const instance = new CodeOperationSuccessPayload(BLEOpcode.CODE_OPERATION_SUCCESS, new Uint8Array([]), new Uint8Array());
    expect(instance).toBeDefined();
  });
});
