import { act, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { TaskProvider } from '../../context/TaskContext';
import { TaskContext } from '../../context/Contexts';
import { TaskContextType } from '../../context/types';
import { TaskType } from '../../types/task';
import * as BLEConnectionHook from '../../hooks/useBLEConnection';
import * as DeviceHook from '../../hooks/useDevice';
import { BLEOpcode } from '../../utils/bleConstants';
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
  let sendRequestMock: Mock;

  beforeEach(() => {
    vi.clearAllMocks();

    sendRequestMock = vi.fn(async (packet) => {
      // Return success for all operations
      return { opcode: BLEOpcode.CODE_OPERATION_SUCCESS };
    });

    (BLEConnectionHook.useBLEConnection as unknown as Mock).mockReturnValue({
      isConnected: true,
      sendRequest: sendRequestMock
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
    // We expect 4 calls:
    // 1. DELETE (auto-inserted)
    // 2. COUNT (from delete)
    // 3. CREATE
    // 4. COUNT (from create - MISSING CURRENTLY)

    await waitFor(() => {
      // We expect at least the CREATE call
       const calls = sendRequestMock.mock.calls.map(call => call[0].opcode);
       // 0x0C = DELETE, 0x14 = COUNT, 0x11 = CREATE
       expect(calls).toContain(BLEOpcode.CREATE_MASTER_CODE);
    }, { timeout: 2000 });

    const calls = sendRequestMock.mock.calls.map(call => call[0].opcode);
    console.log('BLE Calls:', calls.map(c => '0x' + c.toString(16)));

    // Verify sequence
    // First should be Delete (0x0C)
    // Second should be Count (0x14)
    // Third should be Create (0x11)
    // Fourth should be Count (0x14) <-- This is what we want to verify

    // Note: The order between DELETE+COUNT and CREATE depends on task processing.
    // TaskProvider sorts by type: DELETE before ADD.
    // So DELETE (0x0C) executes first.
    // Inside DELETE execution, it calls COUNT (0x14).
    // Then ADD (0x11) executes.
    // Then we want COUNT (0x14) again.

    // Check if the LAST call is COUNT_CODES (0x14)
    expect(calls[calls.length - 1]).toBe(BLEOpcode.COUNT_CODES);

    // Check total number of calls
    // It should be 4
    expect(calls.length).toBe(4);
  });
});
