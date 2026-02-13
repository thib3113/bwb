import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaskExecutorService } from '../../services/TaskExecutorService';
import { BoksTask, TaskType } from '../../types/task';
import { BoksDevice, CODE_TYPE } from '../../types';
import { BLEOpcode } from '../../utils/bleConstants';
import { StorageService } from '../../services/StorageService';
import { db } from '../../db/db';
import {
  CreateMasterCodePacket,
  DeleteMasterCodePacket
} from '../../ble/packets/PinManagementPackets';
import { CountCodesPacket } from '../../ble/packets/StatusPackets';
import { OpenDoorPacket } from '../../ble/packets/OpenDoorPacket';

vi.mock('../../services/StorageService', () => ({
  StorageService: {
    removeCode: vi.fn(),
  },
}));

vi.mock('../../db/db', () => ({
  db: {
    codes: {
      get: vi.fn(),
    },
  },
}));

describe('TaskExecutorService', () => {
  const mockSendRequest = vi.fn();
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
    mockSendRequest.mockResolvedValue({ opcode: BLEOpcode.CODE_OPERATION_SUCCESS });
    const task: BoksTask = {
      ...baseTask,
      type: TaskType.ADD_MASTER_CODE,
      payload: { code: '654321', index: 1 }
    };

    await TaskExecutorService.execute(task, mockDevice, mockSendRequest);

    // Expect 2 calls: CreateMasterCode and CountCodes
    expect(mockSendRequest).toHaveBeenCalledTimes(2);

    const packet1 = mockSendRequest.mock.calls[0][0];
    expect(packet1).toBeInstanceOf(CreateMasterCodePacket);
    expect(packet1.code).toBe('654321');
    expect(packet1.index).toBe(1);

    const packet2 = mockSendRequest.mock.calls[1][0];
    expect(packet2).toBeInstanceOf(CountCodesPacket);
  });

  it('should execute DELETE_CODE (Master) successfully (delete + count)', async () => {
    mockSendRequest.mockResolvedValue({ opcode: BLEOpcode.CODE_OPERATION_SUCCESS });

    const task: BoksTask = {
      ...baseTask,
      type: TaskType.DELETE_CODE,
      payload: {
        codeType: CODE_TYPE.MASTER,
        index: 2,
        codeId: 'code-id-1'
      }
    };

    await TaskExecutorService.execute(task, mockDevice, mockSendRequest);

    // Expect 2 calls: DeleteMasterCode and CountCodes
    expect(mockSendRequest).toHaveBeenCalledTimes(2);

    const deletePacket = mockSendRequest.mock.calls[0][0];
    expect(deletePacket).toBeInstanceOf(DeleteMasterCodePacket);
    expect(deletePacket.index).toBe(2);

    const countPacket = mockSendRequest.mock.calls[1][0];
    expect(countPacket).toBeInstanceOf(CountCodesPacket);

    // Should remove from storage
    expect(StorageService.removeCode).toHaveBeenCalledWith('device-id', 'code-id-1');
  });

  it('should execute UNLOCK_DOOR successfully', async () => {
    mockSendRequest.mockResolvedValue({ opcode: BLEOpcode.CODE_OPERATION_SUCCESS });
    const task: BoksTask = {
      ...baseTask,
      type: TaskType.UNLOCK_DOOR,
      payload: { code: '111111' }
    };

    await TaskExecutorService.execute(task, mockDevice, mockSendRequest);

    expect(mockSendRequest).toHaveBeenCalledTimes(1);
    const packet = mockSendRequest.mock.calls[0][0];
    expect(packet).toBeInstanceOf(OpenDoorPacket);
  });

  it('should throw error if config key is missing for Master Code', async () => {
    const deviceNoKey = { ...mockDevice, configuration_key: undefined } as unknown as BoksDevice;
    const task: BoksTask = {
      ...baseTask,
      type: TaskType.ADD_MASTER_CODE,
      payload: { code: '123456', index: 1 }
    };

    await expect(TaskExecutorService.execute(task, deviceNoKey, mockSendRequest))
      .rejects.toThrow('Configuration Key required');
  });

  it('should throw error on BLE failure and NOT send count', async () => {
    mockSendRequest.mockResolvedValue({ opcode: BLEOpcode.ERROR_UNAUTHORIZED });
    const task: BoksTask = {
      ...baseTask,
      type: TaskType.ADD_MASTER_CODE,
      payload: { code: '123456', index: 1 }
    };

    await expect(TaskExecutorService.execute(task, mockDevice, mockSendRequest))
      .rejects.toThrow();

    expect(mockSendRequest).toHaveBeenCalledTimes(1);
  });
});
