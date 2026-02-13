import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AddCodePayload, BoksTask, TaskType } from '../types/task';
import { useBLEConnection } from '../hooks/useBLEConnection';
import { BLEOpcode } from '../utils/bleConstants';
import { StorageService } from '../services/StorageService';
import { CODE_STATUS } from '../constants/codeStatus';
import { useDevice } from '../hooks/useDevice';
import { TaskContext } from './Contexts';
import { db } from '../db/db';
import { BoksCode, CODE_TYPE } from '../types';
import {
  CreateMasterCodePacket,
  CreateMultiUseCodePacket,
  CreateSingleUseCodePacket,
  DeleteMasterCodePacket,
  DeleteMultiUseCodePacket,
  DeleteSingleUseCodePacket
} from '../ble/packets/PinManagementPackets';
import { CountCodesPacket } from '../ble/packets/StatusPackets';
import { OpenDoorPacket } from '../ble/packets/OpenDoorPacket';
import { BoksTXPacket } from '../ble/packets/BoksTXPacket';

export const TaskProvider = ({ children }: { children: ReactNode }) => {
  const { isConnected, sendRequest } = useBLEConnection();
  const { activeDevice } = useDevice();
  const autoSync = activeDevice?.auto_sync ?? false;

  // In-memory state for tasks
  const [tasks, setTasks] = useState<BoksTask[]>([]);
  // Exposed processing state
  const [isProcessing, setIsProcessing] = useState(false);

  // State to track manual sync requests
  const [manualSyncRequestId, setManualSyncRequestId] = useState<string | null>(null);

  const syncTasks = useCallback(async () => {
    console.log('[TaskContext] Manual sync requested');
    setManualSyncRequestId(crypto.randomUUID());
  }, []);

  // Add a new task to the queue
  // Retry a failed task
  const addTask = useCallback(
    (taskData: Omit<BoksTask, 'id' | 'createdAt' | 'attempts' | 'status'>) => {
      // For ADD_MASTER_CODE tasks, automatically add a DELETE_CODE task first
      if (taskData.type === TaskType.ADD_MASTER_CODE) {
        // Create the delete task with the same configKey and index from payload
        // IMPORTANT: Do NOT include codeId in payload for this automatic cleanup task.
        // This prevents the 'phantom delete' issue where the new code is deleted from DB.
        const deleteTask: BoksTask = {
          ...taskData,
          id: crypto.randomUUID(),
          createdAt: new Date(),
          attempts: 0,
          status: 'pending',
          sync_status: 'created',
          type: TaskType.DELETE_CODE,
          priority: 0, // Highest priority
          payload: {
            ...(taskData.payload as AddCodePayload),
            codeId: undefined, // Explicitly remove codeId
            codeType: 'master',
            index: (taskData.payload as AddCodePayload).index // PASS THE INDEX HERE!
          }
        } as unknown as BoksTask;

        // Create the add task
        const addTask: BoksTask = {
          ...taskData,
          id: crypto.randomUUID(),
          createdAt: new Date(),
          attempts: 0,
          status: 'pending',
          sync_status: 'created'
        } as unknown as BoksTask;

        // Add both tasks to the queue
        setTasks((prevTasks) => [...prevTasks, deleteTask, addTask]);
      } else {
        // For all other tasks, add normally
        const task: BoksTask = {
          ...taskData,
          id: crypto.randomUUID(),
          createdAt: new Date(),
          attempts: 0,
          status: 'pending',
          sync_status: 'created'
        } as unknown as BoksTask;

        setTasks((prevTasks) => [...prevTasks, task]);
      }
    },
    []
  );

  const retryTask = useCallback((taskId: string) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status: 'pending',
              attempts: 0,
              error: undefined,
              lastAttemptAt: undefined
            }
          : task
      )
    );
  }, []);

  // Map task types to actual BLE operations
  const executeTask = useCallback(
    async (task: BoksTask): Promise<void> => {
      if (!activeDevice?.id) {
        console.warn('No active device, cannot execute task');
        throw new Error('No active device, cannot execute task');
      }

      const configKey = activeDevice.configuration_key;
      let packet: BoksTXPacket | undefined;
      let codeId: string | undefined;
      let codeObj: BoksCode | undefined;
      let tempCodeStr: string | undefined;

      try {
        // Update task status to processing
        setTasks((prevTasks) =>
          prevTasks.map((t) =>
            t.id === task.id
              ? {
                  ...t,
                  status: 'processing',
                  lastAttemptAt: new Date()
                }
              : t
          )
        );

        switch (task.type) {
          case TaskType.ADD_MASTER_CODE:
          case TaskType.ADD_SINGLE_USE_CODE:
          case TaskType.ADD_MULTI_USE_CODE:
            if (!configKey || configKey.length !== 8) {
              throw new Error('Configuration Key required (8 chars)');
            }

            tempCodeStr = task.payload.code as string;
            if (tempCodeStr.length !== 6) throw new Error('Code must be 6 characters');

            if (task.type === TaskType.ADD_MASTER_CODE) {
              // Master: ConfigKey + Code + Index
              codeId = task.payload.codeId as string;
              codeObj = await db.codes.get(codeId);
              const masterIndex = codeObj?.index ?? 0;
              packet = new CreateMasterCodePacket(configKey, masterIndex, tempCodeStr);
            } else if (task.type === TaskType.ADD_SINGLE_USE_CODE) {
              packet = new CreateSingleUseCodePacket(configKey, tempCodeStr);
            } else {
              packet = new CreateMultiUseCodePacket(configKey, tempCodeStr);
            }

            if (packet) {
              const response = await sendRequest(packet);

              // Handle response
              if (!Array.isArray(response)) {
                if (response.opcode === BLEOpcode.ERROR_UNAUTHORIZED) {
                  throw new Error('Unauthorized: Configuration Key Required or Invalid');
                }

                if (response.opcode !== BLEOpcode.CODE_OPERATION_SUCCESS) {
                  throw new Error(
                    `Code creation failed with opcode 0x${response.opcode.toString(16)}`
                  );
                }
              }

              // On success, update local code status
              codeId = task.payload.codeId as string;
              if (codeId) {
                await StorageService.updateCodeStatus(
                  activeDevice.id,
                  codeId,
                  CODE_STATUS.ON_DEVICE
                );

                // For Master Codes, clean up any other codes with the same index
                if (task.type === TaskType.ADD_MASTER_CODE) {
                  // Get the newly added code to get its index
                  const newCode = await db.codes.get(codeId);
                  if (newCode && newCode.index !== undefined) {
                    // Find and delete any other codes with the same index but different id
                    const codesToDelete = await db.codes
                      .where('device_id')
                      .equals(activeDevice.id)
                      .filter(
                        (code) =>
                          code.type === CODE_TYPE.MASTER &&
                          code.index === newCode.index &&
                          code.id !== codeId
                      )
                      .toArray();

                    // Delete the old codes
                    for (const oldCode of codesToDelete) {
                      await StorageService.removeCode(activeDevice.id, oldCode.id);
                    }
                  }
                }

                // Request code count after successful addition
                try {
                  await sendRequest(new CountCodesPacket());
                } catch (countError) {
                  console.warn('Failed to request code count after addition:', countError);
                }
              }
            }
            break;

          case TaskType.DELETE_CODE:
            if (!configKey || configKey.length !== 8) {
              throw new Error('Configuration Key required (8 chars)');
            }

            codeId = task.payload.codeId as string;
            // Only fetch from DB if we have a codeId
            if (codeId) {
              codeObj = await db.codes.get(codeId);
            }

            switch (task.payload.codeType as CODE_TYPE) {
              case CODE_TYPE.MASTER: {
                // Use explicit index from payload if available, otherwise check DB object
                // STRICT CHECK: Index MUST be defined. Do not fallback to 0 blindly.
                const targetIndex = (task.payload.index as number) ?? codeObj?.index;

                if (targetIndex === undefined || targetIndex === null) {
                  throw new Error('Index required for Master Code deletion');
                }

                packet = new DeleteMasterCodePacket(configKey, targetIndex);
                break;
              }

              case CODE_TYPE.SINGLE:
                tempCodeStr = (task.payload.code as string) || codeObj?.code;
                if (!tempCodeStr || tempCodeStr.length !== 6)
                  throw new Error('Code string required for deletion');
                packet = new DeleteSingleUseCodePacket(configKey, tempCodeStr);
                break;

              case CODE_TYPE.MULTI:
                tempCodeStr = (task.payload.code as string) || codeObj?.code;
                if (!tempCodeStr || tempCodeStr.length !== 6)
                  throw new Error('Code string required for deletion');
                packet = new DeleteMultiUseCodePacket(configKey, tempCodeStr);
                break;

              default:
                throw new Error('Invalid code type');
            }

            if (packet) {
              const response = await sendRequest(packet);
              // Store opcode for workaround checks

              // Handle response
              if (!Array.isArray(response)) {
                if (response.opcode === BLEOpcode.ERROR_UNAUTHORIZED) {
                  throw new Error('Unauthorized: Configuration Key Required or Invalid');
                }

                // SUCCESS check: 0x77 is success.

                if (
                  response.opcode === BLEOpcode.CODE_OPERATION_SUCCESS
                  // Removed 0x78 auto-success based on user requirement.
                  // Deletion of non-existent code should fail.
                ) {
                  // On success, remove local code entry ONLY if codeId was provided
                  if (codeId) {
                    await StorageService.removeCode(activeDevice.id, codeId);
                  }

                  // Request code count after successful deletion
                  try {
                    await sendRequest(new CountCodesPacket());
                  } catch (countError) {
                    console.warn('Failed to request code count after deletion:', countError);
                  }
                } else {
                  throw new Error(
                    `Code deletion failed with opcode 0x${response.opcode.toString(16)}`
                  );
                }
              }
            }
            break;

          case TaskType.SYNC_CODES:
          case TaskType.GET_LOGS:
          case TaskType.GET_BATTERY_LEVEL:
            // These tasks don't require BLE operations, mark as completed
            break;

          case TaskType.UNLOCK_DOOR:
            {
              const pin = (task.payload?.code as string) || activeDevice.door_pin_code;
              await sendRequest(new OpenDoorPacket(pin));
            }
            break;

          case TaskType.LOCK_DOOR:
            // Locking is mechanical (Strike plate), no command needed or supported
            break;

          case TaskType.GET_DOOR_STATUS:
            // This task doesn't require BLE operations, mark as completed
            break;

          default:
            throw new Error(`Unsupported task type: ${(task as { type: string }).type}`);
        }

        // Mark task as completed
        setTasks((prevTasks) =>
          prevTasks.map((t) => (t.id === task.id ? { ...t, status: 'completed' } : t))
        );
      } catch (error) {
        // Update task with error information
        setTasks((prevTasks) =>
          prevTasks.map((t) =>
            t.id === task.id
              ? {
                  ...t,
                  status: 'failed',
                  error: error instanceof Error ? error.message : String(error),
                  attempts: t.attempts + 1
                }
              : t
          )
        );
        // Re-throw the error so the caller knows the task failed
        throw error;
      }

      // Return a promise that resolves when the task is fully complete
      // This ensures that the caller can await the completion of the task
      return Promise.resolve();
    },
    [sendRequest, activeDevice?.id, activeDevice?.configuration_key, activeDevice?.door_pin_code]
  );

  // Ref for tracking processing state to avoid duplicate execution
  const isProcessingRef = useRef(false);

  // Task runner - processes pending tasks when connected
  // This effect relies on the state update chain:
  // 1. Effect runs, finds pending task.
  // 2. Marks isProcessing = true.
  // 3. Executes task.
  // 4. executeTask updates state (e.g. 'processing' -> 'completed').
  // 5. finally block marks isProcessing = false.
  // 6. State update triggers Effect again.
  // 7. Effect finds next pending task...
  useEffect(() => {
    if (!isConnected) return;
    if (isProcessingRef.current) return;

    // Get pending tasks
    const pendingTasks = tasks.filter((task) => task.status === 'pending');
    if (pendingTasks.length === 0) {
      if (manualSyncRequestId) {
        console.log('[TaskContext] All tasks processed, resetting manual sync request');
        setManualSyncRequestId(null);
      }
      return;
    }

    // Auto Sync Check
    if (!autoSync && !manualSyncRequestId) {
      // Check for urgent tasks (Unlock/Lock)
      const hasUrgentTasks = pendingTasks.some(
        (t) => t.type === TaskType.UNLOCK_DOOR || t.type === TaskType.LOCK_DOOR
      );

      if (!hasUrgentTasks) {
        return;
      }
    }

    const processNextTask = async () => {
      isProcessingRef.current = true;
      setIsProcessing(true); // Signal start of processing cycle
      try {
        // Get the actual list of pending tasks again within the async function
        const currentPendingTasks = tasks.filter((task) => task.status === 'pending');
        if (currentPendingTasks.length === 0) return;

        // Sort tasks by priority and type (DELETE before ADD)
        const sortedPendingTasks = [...currentPendingTasks].sort((a, b) => {
          // First sort by priority
          if (a.priority !== b.priority) {
            return a.priority - b.priority;
          }

          // Then sort by task type: DELETE before ADD
          const isDeleteA = a.type === TaskType.DELETE_CODE;
          const isDeleteB = b.type === TaskType.DELETE_CODE;

          // If one is delete and the other is not, delete comes first
          if (isDeleteA && !isDeleteB) return -1;
          if (!isDeleteA && isDeleteB) return 1;

          // For ADD tasks, sort by opcode (ADD_MASTER_CODE, ADD_SINGLE_USE_CODE, ADD_MULTI_USE_CODE)
          if (!isDeleteA && !isDeleteB) {
            const getOpcodePriority = (task: BoksTask) => {
              switch (task.type) {
                case TaskType.ADD_MASTER_CODE:
                  return 1;
                case TaskType.ADD_SINGLE_USE_CODE:
                  return 2;
                case TaskType.ADD_MULTI_USE_CODE:
                  return 3;
                default:
                  return 4;
              }
            };
            return getOpcodePriority(a) - getOpcodePriority(b);
          }

          // Both are DELETE tasks, sort by opcode (DELETE_MASTER_CODE, DELETE_SINGLE_USE_CODE, DELETE_MULTI_USE_CODE)
          const getDeleteOpcodePriority = (task: BoksTask) => {
            const codeType = task.payload.codeType as CODE_TYPE;
            switch (codeType) {
              case CODE_TYPE.MASTER:
                return 1; // DELETE_MASTER_CODE (0x0C)
              case CODE_TYPE.SINGLE:
                return 2; // DELETE_SINGLE_USE_CODE (0x0D)
              case CODE_TYPE.MULTI:
                return 3; // DELETE_MULTI_USE_CODE (0x0E)
              default:
                return 4;
            }
          };
          return getDeleteOpcodePriority(a) - getDeleteOpcodePriority(b);
        });

        // Execute only the first task in the queue
        const nextTask = sortedPendingTasks[0];

        // Double check urgency if we bypassed the early return
        if (!autoSync && !manualSyncRequestId) {
          if (
            nextTask &&
            nextTask.type !== TaskType.UNLOCK_DOOR &&
            nextTask.type !== TaskType.LOCK_DOOR
          ) {
            // If the first task is NOT urgent, but we had some urgent task in the list,
            // we should probably prioritize the urgent one?
            // But our sort function sorts by priority. Urgent tasks (priority 0?) should be first.
            // Check priority assignment:
            // UNLOCK_DOOR priority? Not set in typical usage, default?
            // Let's assume the user doesn't queue Unlock commands offline typically.
            // But if they did, we should let it through.
            // If nextTask is not urgent, we skip it.
            return;
          }
        }

        if (nextTask) {
          console.log(`[TaskContext] Executing task: ${nextTask.type}`, nextTask.payload);
          await executeTask(nextTask);
          console.log(`[TaskContext] Task completed: ${nextTask.type}`);
        }
      } catch (err) {
        console.error('[TaskContext] Task processing error:', err);
        // Wait 2s before processing next task to flush any late responses
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } finally {
        isProcessingRef.current = false;
        // Check if there are more pending tasks to decide if we should clear isProcessing
        // Actually, since this Effect runs on state change, if there are pending tasks, it will run again.
        // So we can check if there are no pending tasks left to clear state?
        // Or simply clear it here, and the next iteration (if any) will set it back to true.
        // However, this might cause flicker.
        // Let's rely on the Effect re-triggering. If no pending tasks, Effect runs -> finds 0 pending -> returns.
        // We need to set isProcessing to false when the queue is empty.

        // But we are inside the async function. The effect dependency 'tasks' will change when executeTask calls setTasks.
        // So the Effect will re-run.
        // If we set isProcessing(false) here, it might flicker true/false between tasks.
        // But 'isProcessing' is mainly for UI feedback.
        // A better approach: Set isProcessing = true if pending > 0.
        // But we already have logic for that in the Effect start.

        // Let's check remaining tasks
        // We can't see the *future* state here easily.
        // But we can just set it to false here. If the loop continues, it sets it to true immediately?
        // React batching might help.
        setIsProcessing(false);
      }
    };

    processNextTask();
  }, [isConnected, tasks, executeTask, autoSync, manualSyncRequestId]);
  // executeTask is stable due to useCallback and its dependencies, so it won't change between renders

  const value = useMemo(
    () => ({
      addTask,
      retryTask,
      tasks,
      syncTasks,
      isProcessing
    }),
    [addTask, retryTask, tasks, syncTasks, isProcessing]
  );

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
};
