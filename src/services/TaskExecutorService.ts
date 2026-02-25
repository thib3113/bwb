import { BoksTask, TaskType } from '../types/task';
import { BoksDevice, CODE_TYPE } from '../types';
import { CODE_STATUS } from '../constants/codeStatus';
import { StorageService } from './StorageService';
import { db } from '../db/db';
import { BoksController } from '@thib3113/boks-sdk';

export class TaskExecutorService {
  /**
   * Executes a single task using the provided BoksController.
   */
  static async execute(
    task: BoksTask,
    activeDevice: BoksDevice & { configuration_key?: string },
    controller: BoksController
  ): Promise<void> {
    if (!activeDevice) {
      throw new Error('No active device found for task execution');
    }

    // Ensure credentials are set if available
    if (activeDevice.configuration_key) {
      try {
        controller.setCredentials(activeDevice.configuration_key);
      } catch (_e) {
        // Ignore if already set or invalid format (though unlikely if checked elsewhere)
      }
    }

    switch (task.type) {
      case TaskType.ADD_MASTER_CODE:
        {
          if (!activeDevice.configuration_key) {
            throw new Error('Configuration Key required for Master Code operations');
          }
          const { code, index } = task.payload;
          if (index === undefined) throw new Error('Index required for Master Code');

          const success = await controller.createMasterCode(index, code as string);

          if (success) {
            if (task.payload.codeId) {
              await db.codes.update(task.payload.codeId as string, {
                status: CODE_STATUS.ON_DEVICE,
                sync_status: 'synced',
                updated_at: Date.now()
              });
            }
            // Refresh counts
            await controller.countCodes();
          } else {
            throw new Error('Master Code creation failed');
          }
        }
        break;

      case TaskType.ADD_SINGLE_USE_CODE:
        {
          const { code } = task.payload;
          const success = await controller.createSingleUseCode(code as string);

          if (success) {
            if (task.payload.codeId) {
              await db.codes.update(task.payload.codeId as string, {
                status: CODE_STATUS.ON_DEVICE,
                sync_status: 'synced',
                updated_at: Date.now()
              });
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
              await db.codes.update(task.payload.codeId as string, {
                status: CODE_STATUS.ON_DEVICE,
                sync_status: 'synced',
                updated_at: Date.now()
              });
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
            } catch (_e) { /* ignore */ }
          }

          const codeType = task.payload.codeType as CODE_TYPE;
          let success = false;

          switch (codeType) {
            case CODE_TYPE.MASTER: {
              const targetIndex = (task.payload.index as number) ?? codeObj?.index;
              if (targetIndex === undefined || targetIndex === null)
                throw new Error('Index required');
              success = await controller.deleteMasterCode(targetIndex);
              break;
            }
            case CODE_TYPE.SINGLE: {
              const codeStr = (task.payload.code as string) || codeObj?.code;
              if (!codeStr) throw new Error('Code required');
              success = await controller.deleteSingleUseCode(codeStr);
              break;
            }
            case CODE_TYPE.MULTI: {
              const codeStr = (task.payload.code as string) || codeObj?.code;
              if (!codeStr) throw new Error('Code required');
              success = await controller.deleteMultiUseCode(codeStr);
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

      case TaskType.UNLOCK_DOOR:
        {
          const pin = (task.payload?.code as string) || activeDevice.door_pin_code;
          if (!pin) throw new Error('No PIN provided');
          const opened = await controller.openDoor(pin);
          if (!opened) throw new Error('Failed to open door (Invalid PIN?)');
        }
        break;

      case TaskType.SYNC_CODES:
        await controller.countCodes();
        break;

      case TaskType.GET_LOGS:
        // handled by DeviceLogContext usually, but if task based:
        await controller.getLogsCount();
        // logs fetching is usually streaming.
        break;

      case TaskType.GET_BATTERY_LEVEL:
        await controller.getBatteryLevel();
        break;

      case TaskType.GET_DOOR_STATUS:
        await controller.getDoorStatus();
        break;

      case TaskType.LOCK_DOOR:
        break;

      default:
        throw new Error(`Unsupported task type: ${(task as { type: string }).type}`);
    }
  }
}
