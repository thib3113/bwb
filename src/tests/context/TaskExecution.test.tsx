import { act, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { TaskProvider } from '../../context/TaskContext';
import { TaskContext } from '../../context/Contexts';
import { TaskContextType } from '../../context/types';
import { TaskType } from '../../types/task';
import * as BLEConnectionHook from '../../hooks/useBLEConnection';
import * as DeviceHook from '../../hooks/useDevice';
import React, { useContext, useEffect } from 'react';
import { CODE_TYPE } from '../../types';

// Mocks
vi.mock('../../hooks/useBLEConnection', () => ({
  useBLEConnection: vi.fn()
}));

vi.mock('../../hooks/useDevice', () => ({
  useDevice: vi.fn()
}));

vi.mock('../../db/db', () => ({
  db: {
    codes: {
      get: vi.fn(),
      update: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          filter: vi.fn(() => ({
            toArray: vi.fn(() => [])
          }))
        }))
      }))
    }
  }
}));

vi.mock('../../services/StorageService', () => ({
  StorageService: {
    updateCodeStatus: vi.fn(),
    removeCode: vi.fn()
  }
}));

// Helper component
const TaskTrigger = ({ onReady }: { onReady: (addTask: TaskContextType['addTask']) => void }) => {
  const context = useContext(TaskContext);
  useEffect(() => {
    if (context) onReady(context.addTask);
  }, [context, onReady]);
  return null;
};

describe('TaskExecution - Code Count Refresh', () => {
  let mockController: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockController = {
        setCredentials: vi.fn(),
        deleteMasterCode: vi.fn().mockResolvedValue(true),
        createMasterCode: vi.fn().mockResolvedValue(true),
        countCodes: vi.fn().mockResolvedValue({ masterCount: 0, otherCount: 0 })
    };

    (BLEConnectionHook.useBLEConnection as unknown as Mock).mockReturnValue({
      isConnected: true,
      controller: mockController
    });

    (DeviceHook.useDevice as unknown as Mock).mockReturnValue({
      activeDevice: {
        id: 'test-device',
        configuration_key: '12345678',
        auto_sync: true
      }
    });
  });

  it('should request code count after adding a Master Code', async () => {
    let addTaskFn: TaskContextType['addTask'] | undefined;

    render(
      <TaskProvider>
        <TaskTrigger onReady={(fn) => { addTaskFn = fn; }} />
      </TaskProvider>
    );

    await waitFor(() => expect(addTaskFn).toBeDefined());

    // Trigger ADD_MASTER_CODE
    act(() => {
      if (addTaskFn) {
        addTaskFn({
          type: TaskType.ADD_MASTER_CODE,
          deviceId: 'test-device',
          priority: 1,
          payload: {
            code: '123456',
            codeId: 'code-master',
            index: 0,
            codeType: CODE_TYPE.MASTER
          }
        });
      }
    });

    // Wait for tasks to complete
    // We expect:
    // 1. DELETE (auto-inserted)
    // 2. COUNT (from delete)
    // 3. CREATE
    // 4. COUNT (from create)

    await waitFor(() => {
       expect(mockController.createMasterCode).toHaveBeenCalled();
       expect(mockController.deleteMasterCode).toHaveBeenCalled();
    }, { timeout: 2000 });

    // Check count calls
    expect(mockController.countCodes).toHaveBeenCalledTimes(2);

    // Verify sequence could be checked via spy order, but times check is sufficient for this test logic
    // which was ensuring countCodes is called after operations.
  });
});
