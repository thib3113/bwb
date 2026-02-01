import { render, act, waitFor } from '@testing-library/preact';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaskProvider } from '../../context/TaskContext';
import { TaskContext } from '../../context/Contexts';
import { useContext, useEffect } from 'react';
import { TaskType } from '../../types/task';
import * as BLEConnectionHook from '../../hooks/useBLEConnection';
import * as DeviceHook from '../../hooks/useDevice';
import React from 'react';

// Mocks
vi.mock('../../hooks/useBLEConnection', () => ({
  useBLEConnection: vi.fn(),
}));
vi.mock('../../hooks/useDevice', () => ({
  useDevice: vi.fn(),
}));
vi.mock('../../db/db', () => ({
  db: {
    codes: {
      get: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          filter: vi.fn(() => ({
            toArray: vi.fn(() => []),
          })),
        })),
      })),
    },
  },
}));
vi.mock('../../services/StorageService', () => ({
    StorageService: {
        updateCodeStatus: vi.fn(),
        removeCode: vi.fn()
    }
}));


// Helper component to trigger tasks
const TaskTrigger = ({ onReady }: { onReady: (addTask: any) => void }) => {
  const context = useContext(TaskContext);

  useEffect(() => {
    if (context) {
      onReady(context.addTask);
    }
  }, [context, onReady]);

  return <div>Task Trigger</div>;
};

describe('TaskContext Race Condition', () => {
  let sendRequestMock: any;
  let calls: { start: number; end: number, id: number }[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    calls = [];

    // Mock Send Request with delay
    let callCounter = 0;
    sendRequestMock = vi.fn(async () => {
      console.log('Mock implementation executing');
      const id = ++callCounter;
      const start = Date.now();
      await new Promise(resolve => setTimeout(resolve, 50)); // 50ms delay
      const end = Date.now();
      calls.push({ start, end, id });
      return { opcode: 0x77 }; // Success
    });

    (BLEConnectionHook.useBLEConnection as any).mockReturnValue({
      isConnected: true,
      sendRequest: sendRequestMock,
    });

    (DeviceHook.useDevice as any).mockReturnValue({
      activeDevice: {
        id: 'test-device',
        configuration_key: '12345678',
      },
    });
  });

  it('should process tasks sequentially', async () => {
    let addTaskFn: any;

    render(
      <TaskProvider>
        <TaskTrigger onReady={(fn) => { addTaskFn = fn; }} />
      </TaskProvider>
    );

    // Wait for provider to mount
    await waitFor(() => expect(addTaskFn).toBeDefined());

    // Add two tasks simultaneously
    act(() => {
      addTaskFn({
        type: TaskType.ADD_SINGLE_USE_CODE,
        payload: { code: '111111', codeId: 'code1' },
      });
      addTaskFn({
        type: TaskType.ADD_SINGLE_USE_CODE,
        payload: { code: '222222', codeId: 'code2' },
      });
    });

    // Wait for tasks to be processed
    await waitFor(() => {
      expect(calls.length).toBe(2);
    }, { timeout: 2000 });

    console.log('Calls:', calls);
    console.log('Mock calls:', sendRequestMock.mock.calls);

    if (calls.length < 2) {
       // Fallback for debugging if calls is empty but mock calls exist
       console.log("Implementation seemingly not called, but spy recorded calls.");
    }

    const [call1, call2] = calls.sort((a, b) => a.start - b.start);

    // If sequential: Call 2 start must be >= Call 1 end
    // Allowing a tiny margin for clock differences, but generally start >= end
    const isSequential = call2.start >= call1.end;

    if (!isSequential) {
        console.error(`Overlap detected! Call 1: ${call1.start}-${call1.end}, Call 2: ${call2.start}-${call2.end}`);
    }

    expect(isSequential).toBe(true);
  });
});
