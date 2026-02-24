import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaskExecutorService } from '../../services/TaskExecutorService';
import { BoksTask, TaskType } from '../../types/task';
import { BoksDevice, CODE_TYPE } from '../../types';
import { StorageService } from '../../services/StorageService';
import { db } from '../../db/db';
import { BoksController } from '@thib3113/boks-sdk';

vi.mock('../../services/StorageService', () => ({
  StorageService: {
    removeCode: vi.fn(),
  },
}));

vi.mock('../../db/db', () => ({
  db: {
    codes: {
      get: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('TaskExecutorService', () => {
  const mockController = {
    setCredentials: vi.fn(),
    createMasterCode: vi.fn().mockResolvedValue(true),
    createSingleUseCode: vi.fn().mockResolvedValue(true),
    createMultiUseCode: vi.fn().mockResolvedValue(true),
    deleteMasterCode: vi.fn().mockResolvedValue(true),
    deleteSingleUseCode: vi.fn().mockResolvedValue(true),
    deleteMultiUseCode: vi.fn().mockResolvedValue(true),
    countCodes: vi.fn().mockResolvedValue({ masterCount: 0, otherCount: 0 }),
    openDoor: vi.fn().mockResolvedValue(true),
    fetchHistory: vi.fn().mockResolvedValue([]),
    getBatteryLevel: vi.fn().mockResolvedValue(100),
    getDoorStatus: vi.fn().mockResolvedValue(false),
  } as unknown as BoksController;

  const mockDevice: BoksDevice = {
    id: 'device-id',
    configuration_key: 'ABCDEFGH',
    door_pin_code: '123456',
  } as unknown as BoksDevice;

  const baseTask: BoksTask = {
    id: 'task-id',
    createdAt: new Date(),
    attempts: 0,
    status: 'pending',
    deviceId: 'device-id',
    priority: 0,
    type: TaskType.SYNC_CODES, // placeholder
    payload: {}
  } as BoksTask;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should execute ADD_MASTER_CODE successfully (create + count)', async () => {
    const task: BoksTask = {
      ...baseTask,
      type: TaskType.ADD_MASTER_CODE,
      payload: { code: '654321', index: 1, codeId: 'master-1' }
    };

    await TaskExecutorService.execute(task, mockDevice, mockController);

    // Expect setCredentials call with padded key
    const paddedKey = '0'.repeat(56) + 'ABCDEFGH';
    expect(mockController.setCredentials).toHaveBeenCalledWith(paddedKey);

    // Expect createMasterCode call
    expect(mockController.createMasterCode).toHaveBeenCalledWith(1, '654321');

    // Expect countCodes call
    expect(mockController.countCodes).toHaveBeenCalled();

    // Verify DB update
    expect(db.codes.update).toHaveBeenCalledWith('master-1', expect.objectContaining({
      status: 'on_device',
      sync_status: 'synced'
    }));
  });

  it('should execute DELETE_CODE (Master) successfully (delete + count)', async () => {
    const task: BoksTask = {
      ...baseTask,
      type: TaskType.DELETE_CODE,
      payload: {
        codeType: CODE_TYPE.MASTER,
        index: 2,
        codeId: 'code-id-1'
      }
    };

    await TaskExecutorService.execute(task, mockDevice, mockController);

    // Expect deleteMasterCode call
    expect(mockController.deleteMasterCode).toHaveBeenCalledWith(2);

    // Expect countCodes call
    expect(mockController.countCodes).toHaveBeenCalled();

    // Should remove from storage
    expect(StorageService.removeCode).toHaveBeenCalledWith('device-id', 'code-id-1');
  });

  it('should execute UNLOCK_DOOR successfully', async () => {
    const task: BoksTask = {
      ...baseTask,
      type: TaskType.UNLOCK_DOOR,
      payload: { code: '111111' }
    };

    await TaskExecutorService.execute(task, mockDevice, mockController);

    expect(mockController.openDoor).toHaveBeenCalledWith('111111');
  });

  // Note: TaskExecutorService doesn't throw on missing config key for MASTER if SDK requires it,
  // but my implementation checks if (activeDevice.configuration_key) { ... }
  // The SDK controller methods usually require credentials set.
  // The SDK might throw if credentials are not set.
  // My implementation doesn't check credentials explicitly before calling controller methods,
  // relying on controller to throw or handle it.

  it('should throw error on failure and NOT send count', async () => {
    // Mock failure
    vi.mocked(mockController.createMasterCode).mockResolvedValueOnce(false);

    const task: BoksTask = {
      ...baseTask,
      type: TaskType.ADD_MASTER_CODE,
      payload: { code: '123456', index: 1, codeId: 'master-1' }
    };

    await expect(TaskExecutorService.execute(task, mockDevice, mockController))
      .rejects.toThrow('Master Code creation failed');

    expect(mockController.createMasterCode).toHaveBeenCalled();
    expect(mockController.countCodes).not.toHaveBeenCalled();
  });
});
