import { useEffect } from 'react';
import { db } from '../db/db';
import { useTaskContext } from '../hooks/useTaskContext';
import { TaskType } from '../types/task';
import { CODE_STATUS } from '../constants/codeStatus';
import { CodeType } from '../types';

/**
 * Hook to ensure task consistency at device load.
 * It checks for codes in PENDING_ADD/PENDING_DELETE status that don't have corresponding tasks,
 * and recreates the tasks if needed.
 *
 * @param deviceId - The ID of the active device
 */
export const useTaskConsistency = (deviceId: string | null) => {
  const { addTask, tasks } = useTaskContext();

  useEffect(() => {
    const checkAndRecreateTasks = async () => {
      if (!deviceId) return;

      try {
        // 1. Get all codes for this device with pending status
        const pendingCodes = await db.codes
          .where('device_id')
          .equals(deviceId)
          .filter(
            (code) =>
              code.status === CODE_STATUS.PENDING_ADD || code.status === CODE_STATUS.PENDING_DELETE
          )
          .toArray();

        if (pendingCodes.length === 0) return;

        // 2. Get all existing tasks for this device from context
        const existingTasks = tasks.filter((task) => task.deviceId === deviceId);

        // Track indices that already have delete tasks to prevent duplicates
        const deletedIndices = new Set<number>();
        existingTasks.forEach((task) => {
          if (task.type === TaskType.DELETE_CODE && task.payload.codeType === CodeType.MASTER) {
            // For master codes, we track by index
            const codeObj = pendingCodes.find((c) => c.id === task.payload.codeId);
            if (codeObj && codeObj.index !== undefined) {
              deletedIndices.add(codeObj.index);
            }
          }
        });

        // 3. For each pending code, check if a task exists
        for (const code of pendingCodes) {
          const hasTask = existingTasks.some((task) => task.payload.codeId === code.id);

          if (!hasTask) {
            // 4. Recreate the task
            if (code.status === CODE_STATUS.PENDING_ADD) {
              // Add the add task
              let taskType: TaskType;
              switch (code.type) {
                case CodeType.MASTER:
                  taskType = TaskType.ADD_MASTER_CODE;
                  break;
                case CodeType.SINGLE:
                  taskType = TaskType.ADD_SINGLE_USE_CODE;
                  break;
                case CodeType.MULTI:
                  taskType = TaskType.ADD_MULTI_USE_CODE;
                  break;
                default:
                  console.warn(`Unknown code type for recreation: ${code.type}`);
                  continue;
              }

              addTask({
                type: taskType,
                deviceId: deviceId,
                priority: 3, // Consistency checks have lower priority
                payload: {
                  code: code.code,
                  codeId: code.id,
                },
              });
            } else if (code.status === CODE_STATUS.PENDING_DELETE) {
              // For Master Codes, track the index to prevent duplicates
              if (code.type === CodeType.MASTER && code.index !== undefined) {
                // Skip if we already have a delete task for this index
                if (deletedIndices.has(code.index)) {
                  continue;
                }
                // Mark this index as having a delete task
                deletedIndices.add(code.index);
              }

              addTask({
                type: TaskType.DELETE_CODE,
                deviceId: deviceId,
                priority: 0, // Highest priority
                payload: {
                  code: code.code,
                  codeId: code.id,
                  codeType: code.type,
                },
              });
            }
          }
        }
      } catch (error) {
        console.error('Error checking task consistency:', error);
      }
    };

    checkAndRecreateTasks();
  }, [deviceId, addTask, tasks]);
};
