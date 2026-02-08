import { renderHook, waitFor } from '@testing-library/react';
import { useTaskConsistency } from '../../hooks/useTaskConsistency';
import { db } from '../../db/db';
import { BoksTask, TaskType } from '../../types/task';
import { CODE_STATUS } from '../../constants/codeStatus';
import { CODE_TYPE } from '../../types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskContext } from '../../context/Contexts';
import { ReactNode } from 'react';

// Mock TaskContext
const mockAddTask = vi.fn();
// We start with empty tasks
const mockTasks: BoksTask[] = [];

// Wrapper to provide the mocked context
const wrapper = ({ children }: { children: ReactNode }) => (
  <TaskContext.Provider value={{ addTask: mockAddTask, tasks: mockTasks, retryTask: vi.fn() }}>
    {children}
  </TaskContext.Provider>
);

describe('useTaskConsistency', () => {
  const deviceId = 'test-device-id';

  beforeEach(async () => {
    mockAddTask.mockClear();
    await db.codes.clear();
  });

  it('should generate ADD task for PENDING_ADD code', async () => {
    // 1. Add a pending code to DB
    await db.codes.add({
      id: 'code-1',
      device_id: deviceId,
      code: '123456',
      type: CODE_TYPE.SINGLE,
      status: CODE_STATUS.PENDING_ADD,
      name: 'Test Code',
      created_at: new Date().toISOString(),
      sync_status: 'created',
      author_id: 'user-1'
    });

    // 2. Render hook
    renderHook(() => useTaskConsistency(deviceId), { wrapper });

    // 3. Verify addTask is called
    await waitFor(() => {
      expect(mockAddTask).toHaveBeenCalledWith(
        expect.objectContaining({
          type: TaskType.ADD_SINGLE_USE_CODE,
          deviceId: deviceId,
          payload: expect.objectContaining({
            code: '123456',
            codeId: 'code-1'
          })
        })
      );
    });
  });

  it('should generate DELETE task for PENDING_DELETE code', async () => {
    // 1. Add a pending delete code to DB
    await db.codes.add({
      id: 'code-2',
      device_id: deviceId,
      code: '654321',
      type: CODE_TYPE.MULTI,
      status: CODE_STATUS.PENDING_DELETE,
      name: 'Delete Me',
      created_at: new Date().toISOString(),
      sync_status: 'synced',
      author_id: 'user-1'
    });

    // 2. Render hook
    renderHook(() => useTaskConsistency(deviceId), { wrapper });

    // 3. Verify addTask is called
    await waitFor(() => {
      expect(mockAddTask).toHaveBeenCalledWith(
        expect.objectContaining({
          type: TaskType.DELETE_CODE,
          deviceId: deviceId,
          priority: 0,
          payload: expect.objectContaining({
            code: '654321',
            codeId: 'code-2',
            codeType: CODE_TYPE.MULTI
          })
        })
      );
    });
  });

  it('should handle Master Code PENDING_ADD by creating ADD_MASTER_CODE task', async () => {
    // Note: The splitting into DELETE + ADD happens in TaskContext.addTask, not useTaskConsistency.
    // useTaskConsistency just calls addTask(ADD_MASTER_CODE).

    await db.codes.add({
      id: 'code-master',
      device_id: deviceId,
      code: '999999',
      type: CODE_TYPE.MASTER,
      index: 5,
      status: CODE_STATUS.PENDING_ADD,
      name: 'Master Key',
      created_at: new Date().toISOString(),
      sync_status: 'created',
      author_id: 'user-1'
    });

    renderHook(() => useTaskConsistency(deviceId), { wrapper });

    await waitFor(() => {
      expect(mockAddTask).toHaveBeenCalledWith(
        expect.objectContaining({
          type: TaskType.ADD_MASTER_CODE,
          deviceId: deviceId,
          payload: expect.objectContaining({
            code: '999999',
            codeId: 'code-master'
          })
        })
      );
    });
  });
});
