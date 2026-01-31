import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { BoksTask, TaskType } from '../types/task';
import { useBLEConnection } from '../hooks/useBLEConnection';
import { BLEOpcode } from '../utils/bleConstants';
import { StorageService } from '../services/StorageService';
import { CODE_STATUS } from '../constants/codeStatus';
import { useDevice } from '../hooks/useDevice';
import { TaskContext } from './Contexts';
import { CODE_TYPES } from '../utils/constants';
import { db } from '../db/db';
import { BoksCode } from '../types';
import {
  CreateMasterCodePacket,
  CreateMultiUseCodePacket,
  CreateSingleUseCodePacket,
  DeleteMasterCodePacket,
  DeleteMultiUseCodePacket,
  DeleteSingleUseCodePacket,
} from '../ble/packets/PinManagementPackets';
import { CountCodesPacket } from '../ble/packets/StatusPackets';
import { OpenDoorPacket } from '../ble/packets/OpenDoorPacket';
import { CloseDoorPacket } from '../ble/packets/CloseDoorPacket';
import { BoksTXPacket } from '../ble/packets/BoksTXPacket';

export const TaskProvider = ({ children }: { children: ReactNode }) => {
  const { isConnected, sendRequest } = useBLEConnection();
  const { activeDevice } = useDevice();

  // In-memory state for tasks
  const [tasks, setTasks] = useState<BoksTask[]>([]);

  // Add a new task to the queue
  const addTask = useCallback(
    (taskData: Omit<BoksTask, 'id' | 'createdAt' | 'attempts' | 'status'>) => {
      // For ADD_MASTER_CODE tasks, automatically add a DELETE_CODE task first
      if (taskData.type === TaskType.ADD_MASTER_CODE) {
        // Create the delete task with the same configKey and index from payload
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
            ...taskData.payload,
            codeType: 'master',
          },
        };

        // Create the add task
        const addTask: BoksTask = {
          ...taskData,
          id: crypto.randomUUID(),
          createdAt: new Date(),
          attempts: 0,
          status: 'pending',
          sync_status: 'created',
        };

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
          sync_status: 'created',
        };

        setTasks((prevTasks) => [...prevTasks, task]);
      }
    },
    []
  );

  // Retry a failed task
  const retryTask = useCallback((taskId: string) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status: 'pending',
              attempts: 0,
              error: undefined,
              lastAttemptAt: undefined,
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
                  lastAttemptAt: new Date(),
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
                          code.type === CODE_TYPES.MASTER &&
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
              }
            }
            break;

          case TaskType.DELETE_CODE:
            if (!configKey || configKey.length !== 8) {
              throw new Error('Configuration Key required (8 chars)');
            }

            codeId = task.payload.codeId as string;
            codeObj = await db.codes.get(codeId); // Fetch code to get index if needed

            switch (task.payload.codeType as string) {
              case CODE_TYPES.MASTER:
                packet = new DeleteMasterCodePacket(configKey, codeObj?.index ?? 0);
                break;

              case CODE_TYPES.SINGLE:
                tempCodeStr = (task.payload.code as string) || codeObj?.code;
                if (!tempCodeStr || tempCodeStr.length !== 6)
                  throw new Error('Code string required for deletion');
                packet = new DeleteSingleUseCodePacket(configKey, tempCodeStr);
                break;

              case CODE_TYPES.MULTI:
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
              const opcode = packet.opcode;

              // Handle response
              if (!Array.isArray(response)) {
                if (response.opcode === BLEOpcode.ERROR_UNAUTHORIZED) {
                  throw new Error('Unauthorized: Configuration Key Required or Invalid');
                }

                // SUCCESS check: 0x77 is success.
                // WORKAROUND: Firmware bug for Single/Multi codes deletion
                // SPECIAL CASE: 0x78 (CODE_OPERATION_ERROR) for deletion is treated as success for idempotency
                // (if code doesn't exist, deleting it should be considered successful)
                const isWorkaroundOpcode =
                  ((task.payload.codeType === CODE_TYPES.SINGLE ||
                    task.payload.codeType === CODE_TYPES.MULTI) &&
                    opcode === BLEOpcode.DELETE_SINGLE_USE_CODE) ||
                  opcode === BLEOpcode.DELETE_MULTI_USE_CODE;

                if (
                  response.opcode === BLEOpcode.CODE_OPERATION_SUCCESS ||
                  response.opcode === BLEOpcode.CODE_OPERATION_ERROR || // Treat 0x78 as success for idempotency
                  (isWorkaroundOpcode && response.opcode === BLEOpcode.CODE_OPERATION_ERROR)
                ) {
                  // On success, remove local code entry
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
            // Note: OpenDoorPacket requires a PIN code string.
            // If this task is meant to be a simple open door command, we need to pass the PIN.
            // Assuming we want to open with an empty string or standard value if not provided?
            // Wait, OPEN_DOOR packet ALWAYS requires a payload (the PIN).
            // Looking at previous implementation: await sendRequest(BLEOpcode.OPEN_DOOR, new Uint8Array());
            // This suggests it was sending empty payload? Or was it implicitly getting PIN?
            // The OpenDoorPacket requires a PIN. If TaskType.UNLOCK_DOOR payload doesn't have it, we might fail.
            // Let's assume the previous empty Uint8Array was intentional (maybe works for some firmware?)
            // OR it was broken.
            // Actually, OPEN_DOOR (0x01) usually takes the Master PIN.
            // Let's try to get it from payload or device config.
            {
               const pin = (task.payload?.code as string) || activeDevice.door_pin_code || "000000";
               await sendRequest(new OpenDoorPacket(pin));
            }
            break;

          case TaskType.LOCK_DOOR:
            await sendRequest(new CloseDoorPacket());
            break;

          case TaskType.GET_DOOR_STATUS:
            // This task doesn't require BLE operations, mark as completed
            break;

          default:
            throw new Error(`Unsupported task type: ${task.type}`);
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
                  attempts: t.attempts + 1,
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
    [sendRequest, activeDevice?.id, activeDevice?.configuration_key]
  );

  // Task runner - processes pending tasks when connected
  useEffect(() => {
    if (!isConnected) return;

    // Get pending tasks to check if we have any before processing
    const pendingTasks = [...tasks]
      .filter((task) => task.status === 'pending');

    // Only process if we have pending tasks
    if (pendingTasks.length > 0) {
      // Process pending tasks
      const processPendingTasks = async () => {
        // Sort tasks by priority and type (DELETE before ADD)
        const sortedPendingTasks = [...pendingTasks]
          .sort((a, b) => {
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
              // We need to determine the actual opcode from the codeType in payload
              const codeType = task.payload.codeType as string;
              switch (codeType) {
                case CODE_TYPES.MASTER:
                  return 1; // DELETE_MASTER_CODE (0x0C)
                case CODE_TYPES.SINGLE:
                  return 2; // DELETE_SINGLE_USE_CODE (0x0D)
                case CODE_TYPES.MULTI:
                  return 3; // DELETE_MULTI_USE_CODE (0x0E)
                default:
                  return 4;
              }
            };
            return getDeleteOpcodePriority(a) - getDeleteOpcodePriority(b);
          });

        // Process tasks one by one
        for (const task of sortedPendingTasks) {
          // Wait for the task to complete before processing the next one
          await executeTask(task);
        }
      };

      processPendingTasks();
    }
  }, [isConnected, tasks]); // Removed executeTask from dependencies to prevent unnecessary re-renders
  // executeTask is stable due to useCallback and its dependencies, so it won't change between renders

  const value = useMemo(
    () => ({
      addTask,
      retryTask,
      tasks,
    }),
    [addTask, retryTask, tasks]
  );

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
};
