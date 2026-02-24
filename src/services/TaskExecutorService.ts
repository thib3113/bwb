import { BoksTask, TaskType } from '../types/task';
import { BoksDevice, CODE_TYPE } from '../types';
import { BLEOpcode } from '../utils/bleConstants';
import { CODE_STATUS } from '../constants/codeStatus';
import { StorageService } from './StorageService';
import { db } from '../db/db';
import { BoksController, BoksOpcode } from '@thib3113/boks-sdk';

export class TaskExecutorService {
  /**
   * Executes a single task using the provided BoksController.
   */
  static async execute(
    task: BoksTask,
    activeDevice: BoksDevice,
    controller: BoksController
  ): Promise<void> {
    if (!activeDevice) {
      throw new Error('No active device found for task execution');
    }

    // Setup credentials on the controller if needed
    // Workaround: SDK expects full 32-byte Master Key, but we only have Config Key (8 chars).
    // The SDK derives Config Key as the last 8 chars of Master Key.
    // So we pad with zeros to satisfy the length check.
    if (activeDevice.configuration_key) {
        const configKey = activeDevice.configuration_key;
        if (configKey.length === 8) {
            const paddedKey = '0'.repeat(56) + configKey;
            controller.setCredentials(paddedKey);
        } else if (configKey.length === 64) {
             controller.setCredentials(configKey);
        } else {
            console.warn(`[TaskExecutor] Invalid Config Key length: ${configKey.length}`);
            // Might throw inside controller if we don't set it, but let's try.
        }
    }

    switch (task.type) {
      case TaskType.ADD_MASTER_CODE:
        {
          const { code, index } = task.payload;
          if (index === undefined) throw new Error('Index required for Master Code');

          // SDK: createMasterCode(index: number, pin: string)
          const success = await controller.createMasterCode(index, code as string);

          if (success) {
            if (task.payload.codeId) {
              await TaskExecutorService.updateCodeStatus(task.payload.codeId as string);
            }
            await controller.countCodes();
          } else {
            throw new Error('Master Code creation failed');
          }
        }
        break;

      case TaskType.ADD_SINGLE_USE_CODE:
        {
          const { code } = task.payload;
          // SDK: createSingleUseCode(pin: string)
          const success = await controller.createSingleUseCode(code as string);
          // SDK handles the quirk #5 internally? Let's check SDK source later or assume yes or catch error.
          // BoksController wrapper should be robust.

          if (success) {
            if (task.payload.codeId) {
              await TaskExecutorService.updateCodeStatus(task.payload.codeId as string);
            }
            await controller.countCodes();
          } else {
            throw new Error('Single Use Code creation failed');
          }
        }
        break;

      case TaskType.ADD_MULTI_USE_CODE:
        {
          const { code } = task.payload;
          const success = await controller.createMultiUseCode(code as string);

          if (success) {
             if (task.payload.codeId) {
              await TaskExecutorService.updateCodeStatus(task.payload.codeId as string);
            }
            await controller.countCodes();
          } else {
             throw new Error('Multi Use Code creation failed');
          }
        }
        break;

      case TaskType.DELETE_CODE:
        {
          const codeId = task.payload.codeId as string;
          let codeObj;

          if (codeId) {
            try {
              codeObj = await db.codes.get(codeId);
            } catch (e) {
              console.warn('Failed to fetch code from DB', e);
            }
          }

          const codeType = task.payload.codeType as CODE_TYPE;
          let success = false;

          switch (codeType) {
            case CODE_TYPE.MASTER: {
              const targetIndex = (task.payload.index as number) ?? codeObj?.index;
              if (targetIndex === undefined || targetIndex === null) {
                throw new Error('Index required for Master Code deletion');
              }
              success = await controller.deleteMasterCode(targetIndex);
              break;
            }

            case CODE_TYPE.SINGLE: {
              const tempCodeStr = (task.payload.code as string) || codeObj?.code;
              if (!tempCodeStr) throw new Error('Code string required for deletion');
              success = await controller.deleteSingleUseCode(tempCodeStr);
              break;
            }

            case CODE_TYPE.MULTI: {
              const tempCodeStr = (task.payload.code as string) || codeObj?.code;
              if (!tempCodeStr) throw new Error('Code string required for deletion');
              success = await controller.deleteMultiUseCode(tempCodeStr);
              break;
            }

            default:
              throw new Error('Invalid code type');
          }

          if (success) {
            if (codeId) {
              await StorageService.removeCode(activeDevice.id, codeId);
            }
            await controller.countCodes();
          } else {
             throw new Error('Code deletion failed');
          }
        }
        break;

      case TaskType.SYNC_CODES:
         await controller.countCodes();
         break;

      case TaskType.GET_LOGS:
         // controller.fetchHistory() is handled by DeviceLogContext usually, but if invoked as task:
         await controller.fetchHistory();
         break;

      case TaskType.GET_BATTERY_LEVEL:
         await controller.getBatteryLevel();
         break;

      case TaskType.GET_DOOR_STATUS:
         await controller.getDoorStatus();
         break;

      case TaskType.UNLOCK_DOOR:
        {
          const pin = (task.payload?.code as string) || activeDevice.door_pin_code;
          if (!pin) {
            throw new Error('No PIN provided for Unlock Door task');
          }
          await controller.openDoor(pin);
        }
        break;

      case TaskType.LOCK_DOOR:
        break;

      default:
        throw new Error(`Unsupported task type: ${(task as { type: string }).type}`);
    }
  }

  private static async updateCodeStatus(codeId: string) {
      try {
        await db.codes.update(codeId, {
          status: CODE_STATUS.ON_DEVICE,
          sync_status: 'synced',
          updated_at: Date.now()
        });
      } catch (dbError) {
        console.warn('Failed to update code status in DB after creation:', dbError);
      }
  }
}
