import { BoksTask, TaskType } from '../types/task';
import { BoksDevice, CODE_TYPE } from '../types';
import { BLEOpcode } from '../utils/bleConstants';
import { CODE_STATUS } from '../constants/codeStatus';
import { StorageService } from './StorageService';
import { db } from '../db/db';
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
import { BLEPacket } from '../utils/packetParser';

// Define the shape of the sendRequest function expected by this service
export type SendRequestFn = (packet: BoksTXPacket) => Promise<BLEPacket>;

export class TaskExecutorService {
  /**
   * Executes a single task using the provided BLE connection and device context.
   * This function handles the logic for creating appropriate packets, sending them,
   * checking responses, and performing necessary side effects (DB updates).
   */
  static async execute(
    task: BoksTask,
    activeDevice: BoksDevice,
    sendRequest: SendRequestFn
  ): Promise<void> {
    if (!activeDevice) {
      throw new Error('No active device found for task execution');
    }

    switch (task.type) {
      case TaskType.ADD_MASTER_CODE:
        {
          if (!activeDevice.configuration_key) {
            throw new Error('Configuration Key required for Master Code operations');
          }
          const { code, index } = task.payload;
          if (index === undefined) throw new Error('Index required for Master Code');

          const packet = new CreateMasterCodePacket(
            activeDevice.configuration_key,
            index,
            code as string
          );
          const response = await sendRequest(packet);

          if (response.opcode === BLEOpcode.CODE_OPERATION_SUCCESS) {
            // Update code status in DB if codeId is present
            if (task.payload.codeId) {
              try {
                await db.codes.update(task.payload.codeId as string, {
                  status: CODE_STATUS.ON_DEVICE,
                  sync_status: 'synced',
                  updated_at: Date.now()
                });
              } catch (dbError) {
                console.warn('Failed to update code status in DB after creation:', dbError);
              }
            }

            // Request code count after successful creation
            try {
              await sendRequest(new CountCodesPacket());
            } catch (countError) {
              console.warn('Failed to request code count after creation:', countError);
            }
          } else {
            throw new Error(
              `Master Code creation failed with opcode 0x${response.opcode.toString(16)}`
            );
          }
        }
        break;

      case TaskType.ADD_SINGLE_USE_CODE:
        {
          const { code } = task.payload;
          const packet = new CreateSingleUseCodePacket(
            activeDevice.configuration_key || '',
            code as string
          );
          let response = await sendRequest(packet);

          // Workaround for Quirk #5: False Error on Single-Use Creation
          // Some firmware versions return 0x78 (ERROR) even if creation succeeded.
          if (response.opcode === BLEOpcode.CODE_OPERATION_ERROR) {
            console.warn(
              '[TaskExecutor] Single Use Code creation returned 0x78, double-checking with COUNT_CODES (Quirk #5)'
            );
            try {
              const countResponse = await sendRequest(new CountCodesPacket());
              if (countResponse.opcode === BLEOpcode.NOTIFY_CODES_COUNT) {
                console.log(
                  '[TaskExecutor] Received NOTIFY_CODES_COUNT after 0x78, assuming success.'
                );
                // We treat this as a success to allow the task to complete
                response = { ...response, opcode: BLEOpcode.CODE_OPERATION_SUCCESS };
              }
            } catch (e) {
              console.error('[TaskExecutor] Double-check failed:', e);
            }
          }

          if (response.opcode === BLEOpcode.CODE_OPERATION_SUCCESS) {
            // Update code status in DB if codeId is present
            if (task.payload.codeId) {
              try {
                await db.codes.update(task.payload.codeId as string, {
                  status: CODE_STATUS.ON_DEVICE,
                  sync_status: 'synced',
                  updated_at: Date.now()
                });
              } catch (dbError) {
                console.warn('Failed to update code status in DB after creation:', dbError);
              }
            }

            try {
              await sendRequest(new CountCodesPacket());
            } catch (countError) {
              console.warn('Failed to request code count after creation:', countError);
            }
          } else {
            throw new Error(
              `Single Use Code creation failed with opcode 0x${response.opcode.toString(16)}`
            );
          }
        }
        break;

      case TaskType.ADD_MULTI_USE_CODE:
        {
          const { code } = task.payload;
          const packet = new CreateMultiUseCodePacket(
            activeDevice.configuration_key || '',
            code as string
          );
          const response = await sendRequest(packet);

          if (response.opcode === BLEOpcode.CODE_OPERATION_SUCCESS) {
            // Update code status in DB if codeId is present
            if (task.payload.codeId) {
              try {
                await db.codes.update(task.payload.codeId as string, {
                  status: CODE_STATUS.ON_DEVICE,
                  sync_status: 'synced',
                  updated_at: Date.now()
                });
              } catch (dbError) {
                console.warn('Failed to update code status in DB after creation:', dbError);
              }
            }

            try {
              await sendRequest(new CountCodesPacket());
            } catch (countError) {
              console.warn('Failed to request code count after creation:', countError);
            }
          } else {
            throw new Error(
              `Multi Use Code creation failed with opcode 0x${response.opcode.toString(16)}`
            );
          }
        }
        break;

      case TaskType.DELETE_CODE:
        {
          const configKey = activeDevice.configuration_key;
          if (!configKey || configKey.length !== 8) {
            throw new Error('Configuration Key required (8 chars)');
          }

          const codeId = task.payload.codeId as string;
          let codeObj;

          // Only fetch from DB if we have a codeId
          if (codeId) {
            try {
              codeObj = await db.codes.get(codeId);
            } catch (e) {
              console.warn('Failed to fetch code from DB', e);
            }
          }

          let packet: BoksTXPacket;
          const codeType = task.payload.codeType as CODE_TYPE;

          switch (codeType) {
            case CODE_TYPE.MASTER: {
              const targetIndex = (task.payload.index as number) ?? codeObj?.index;

              if (targetIndex === undefined || targetIndex === null) {
                throw new Error('Index required for Master Code deletion');
              }

              packet = new DeleteMasterCodePacket(configKey, targetIndex);
              break;
            }

            case CODE_TYPE.SINGLE: {
              const tempCodeStr = (task.payload.code as string) || codeObj?.code;
              if (!tempCodeStr || tempCodeStr.length !== 6)
                throw new Error('Code string required for deletion');
              packet = new DeleteSingleUseCodePacket(configKey, tempCodeStr);
              break;
            }

            case CODE_TYPE.MULTI: {
              const tempCodeStr = (task.payload.code as string) || codeObj?.code;
              if (!tempCodeStr || tempCodeStr.length !== 6)
                throw new Error('Code string required for deletion');
              packet = new DeleteMultiUseCodePacket(configKey, tempCodeStr);
              break;
            }

            default:
              throw new Error('Invalid code type');
          }

          const response = await sendRequest(packet);

          if (response.opcode === BLEOpcode.ERROR_UNAUTHORIZED) {
            throw new Error('Unauthorized: Configuration Key Required or Invalid');
          }

          if (response.opcode === BLEOpcode.CODE_OPERATION_SUCCESS) {
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
            throw new Error(`Code deletion failed with opcode 0x${response.opcode.toString(16)}`);
          }
        }
        break;

      case TaskType.SYNC_CODES:
      case TaskType.GET_LOGS:
      case TaskType.GET_BATTERY_LEVEL:
      case TaskType.GET_DOOR_STATUS:
        // These tasks don't require specific BLE operations in this executor
        break;

      case TaskType.UNLOCK_DOOR:
        {
          const pin = (task.payload?.code as string) || activeDevice.door_pin_code;
          if (!pin) {
            throw new Error('No PIN provided for Unlock Door task');
          }
          await sendRequest(new OpenDoorPacket(pin));
        }
        break;

      case TaskType.LOCK_DOOR:
        // Locking is mechanical, no command needed
        break;

      default:
        throw new Error(`Unsupported task type: ${(task as { type: string }).type}`);
    }
  }
}
