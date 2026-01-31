import { ReactNode, useCallback, useEffect, useMemo, useRef } from 'react';
import { useBLE } from '../hooks/useBLE';
import { useDevice } from '../hooks/useDevice';
import { BLEOpcode } from '../utils/bleConstants';
import { BLEPacket } from '../utils/packetParser';
import { StorageService } from '../services/StorageService';
import { CODE_STATUS } from '../constants/codeStatus';
import { BoksCode, CodeCreationData } from '../types';
import { useTaskContext } from '../hooks/useTaskContext';
import { TaskType } from '../types/task';
import { CodeContext } from './Contexts';
import { APP_DEFAULTS, CODE_TYPES } from '../utils/constants';

export const CodeProvider = ({ children }: { children: ReactNode }) => {
  const { log, addListener, removeListener } = useBLE();
  const { activeDevice } = useDevice();
  const { addTask } = useTaskContext();
  const onCodeUsedRef = useRef<((code: string) => void) | null>(null);

  // Handle code usage notifications
  useEffect(() => {
    const handleCodeUsed = (packet: BLEPacket) => {
      // Extract code from payload
      // For 0x86: [Age(3), Code(6), Padding(2), MAC(6)] = 17 bytes
      // For 0x87: [Age(3), Code(6)] = 9 bytes
      if (packet.payload.length >= 9) {
        const codeBytes = packet.payload.slice(3, 9);
        const code = String.fromCharCode(...codeBytes);
        log(`Valid code used: ${code}`, 'info');

        if (typeof onCodeUsedRef.current === 'function') {
          onCodeUsedRef.current(code);
        }
      }
    };

    const handleValidOpen = () => log('Valid open code', 'info');
    const handleInvalidOpen = () => log('Invalid open code', 'error');

    addListener(BLEOpcode.LOG_CODE_BLE_VALID_HISTORY, handleCodeUsed);
    addListener(BLEOpcode.LOG_CODE_KEY_VALID_HISTORY, handleCodeUsed);
    addListener(BLEOpcode.VALID_OPEN_CODE, handleValidOpen);
    addListener(BLEOpcode.INVALID_OPEN_CODE, handleInvalidOpen);

    return () => {
      removeListener(BLEOpcode.LOG_CODE_BLE_VALID_HISTORY, handleCodeUsed);
      removeListener(BLEOpcode.LOG_CODE_KEY_VALID_HISTORY, handleCodeUsed);
      removeListener(BLEOpcode.VALID_OPEN_CODE, handleValidOpen);
      removeListener(BLEOpcode.INVALID_OPEN_CODE, handleInvalidOpen);
    };
  }, [addListener, removeListener, log]);

  const createCode = useCallback(
    async (codeData: CodeCreationData) => {
      const deviceId = activeDevice?.id;
      if (!deviceId) {
        throw new Error('No active device');
      }

      // 1. Generate a UUID for the code
      const codeId = crypto.randomUUID();

      // Create the code object to save
      const codeToSave: BoksCode = {
        id: codeId,
        device_id: deviceId,
        author_id: APP_DEFAULTS.AUTHOR_ID,
        code: codeData.code,
        type: codeData.type,
        name: codeData.name || '',
        status: CODE_STATUS.PENDING_ADD,
        sync_status: 'created',
        created_at: new Date().toISOString(),
      };

      await StorageService.saveCodes(deviceId, [codeToSave]);

      // Map code types to task types
      let taskType: TaskType;
      switch (codeData.type) {
        case CODE_TYPES.MASTER:
          taskType = TaskType.ADD_MASTER_CODE;
          break;
        case CODE_TYPES.SINGLE:
          taskType = TaskType.ADD_SINGLE_USE_CODE;
          break;
        case CODE_TYPES.MULTI:
          taskType = TaskType.ADD_MULTI_USE_CODE;
          break;
        default:
          throw new Error(`Unsupported code type: ${codeData.type}`);
      }

      // Add to task queue
      await addTask({
        type: taskType,
        deviceId: deviceId,
        priority: 1, // High priority for code creation
        payload: {
          code: codeData.code,
          codeId: codeId,
        },
      });
    },
    [activeDevice, addTask]
  );

  // Delete a code from the device (Refactored to use TaskContext)
  const deleteCode = useCallback(
    async (codeData: BoksCode) => {
      const deviceId = activeDevice?.id;
      if (!deviceId || !codeData.id) {
        throw new Error('No active device or code ID');
      }

      // Mark code as pending delete
      await StorageService.updateCodeStatus(deviceId, codeData.id, CODE_STATUS.PENDING_DELETE);

      // Add to task queue
      await addTask({
        type: TaskType.DELETE_CODE,
        deviceId: deviceId,
        priority: 0, // Highest priority: must delete before adding to avoid index conflicts
        payload: {
          code: codeData.code,
          codeId: codeData.id,
          codeType: codeData.type,
        },
      });
    },
    [activeDevice, addTask]
  );

  // DEPRECATED: This logic is now handled by TaskContext
  // const syncPendingActions = useCallback(async (deviceId: string) => { ... }, []);

  const onCodeUsed = useCallback((callback: (code: string) => void) => {
    onCodeUsedRef.current = callback;
  }, []);

  // DEPRECATED: Auto-sync is now handled by TaskContext
  // useEffect(() => { ... }, []);

  // Exposing syncPendingActions allows BoksContext or UI to trigger it with the correct ID.

  const value = useMemo(
    () => ({
      createCode,
      deleteCode,
      // syncPendingActions, // Deprecated
      onCodeUsed,
    }),
    [createCode, deleteCode, onCodeUsed]
  );

  return <CodeContext.Provider value={value}>{children}</CodeContext.Provider>;
};
