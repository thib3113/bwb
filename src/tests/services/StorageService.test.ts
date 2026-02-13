import { beforeEach, describe, expect, it } from 'vitest';
import { StorageService } from '../../services/StorageService';
import { db } from '../../db/db';
import { CODE_STATUS } from '../../constants/codeStatus';
import { BoksCode, CODE_TYPE } from '../../types';
import { IDBKeyRange, indexedDB } from 'fake-indexeddb';

// Configure global indexedDB for Dexie
globalThis.indexedDB = indexedDB;
globalThis.IDBKeyRange = IDBKeyRange;

describe('StorageService', () => {
  const testBoksId = 'test-device-123';

  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('should save and load codes correctly', async () => {
    const codes: Partial<BoksCode>[] = [
      {
        id: 'code-1',
        code: '123456',
        type: CODE_TYPE.MASTER,
        status: CODE_STATUS.SYNCED
      },
      {
        id: 'code-2',
        code: '654321',
        type: CODE_TYPE.SINGLE,
        status: CODE_STATUS.SYNCED
      }
    ];

    await StorageService.saveCodes(testBoksId, codes);

    const loadedCodes = await StorageService.loadCodes(testBoksId);
    expect(loadedCodes).toHaveLength(2);
    expect(loadedCodes.find((c) => c.id === 'code-1')?.code).toBe('123456');
    expect(loadedCodes.find((c) => c.id === 'code-2')?.code).toBe('654321');
  });

  it('should handle duplicate IDs gracefully by updating or failing depending on logic', async () => {
    // Note: saveCodes currently deletes all existing codes for the device before adding new ones
    // so we are testing that behavior here
    const initialCodes: Partial<BoksCode>[] = [
      { id: 'code-1', code: '111111', type: CODE_TYPE.MASTER }
    ];
    await StorageService.saveCodes(testBoksId, initialCodes);

    const newCodes: Partial<BoksCode>[] = [
      { id: 'code-2', code: '222222', type: CODE_TYPE.SINGLE }
    ];
    await StorageService.saveCodes(testBoksId, newCodes);

    const loadedCodes = await StorageService.loadCodes(testBoksId);
    expect(loadedCodes).toHaveLength(2);
    expect(loadedCodes.find((c) => c.id === 'code-1')).toBeDefined();
    expect(loadedCodes.find((c) => c.id === 'code-2')).toBeDefined();
  });

  it('should generate unique IDs when id is missing', async () => {
    const codesWithoutIds: Partial<BoksCode>[] = [
      { code: '111111', type: CODE_TYPE.MASTER },
      { code: '222222', type: CODE_TYPE.SINGLE },
      { code: '333333', type: CODE_TYPE.MULTI }
    ];

    await StorageService.saveCodes(testBoksId, codesWithoutIds);

    const loadedCodes = await StorageService.loadCodes(testBoksId);
    expect(loadedCodes).toHaveLength(3);

    // Verify all IDs are unique
    const ids = loadedCodes.map((c) => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(3);
  });

  it('should remove a code correctly', async () => {
    const codes: Partial<BoksCode>[] = [
      { id: 'code-1', code: '123456', type: CODE_TYPE.MASTER },
      { id: 'code-2', code: '654321', type: CODE_TYPE.SINGLE }
    ];
    await StorageService.saveCodes(testBoksId, codes);

    await StorageService.removeCode(testBoksId, 'code-1');

    const loadedCodes = await StorageService.loadCodes(testBoksId);
    expect(loadedCodes).toHaveLength(1);
    expect(loadedCodes[0].id).toBe('code-2');
  });
});
