import { useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { db } from '../db/db';
import { StorageService } from '../services/StorageService';
import { CODE_STATUS } from '../constants/codeStatus';
import { useDevice } from './useDevice';
import { useCodeCount } from './useCodeCount';
import { useBLEConnection } from './useBLEConnection';
import { BoksCode, BoksLog, CodeStatus } from '../types';
import { EMPTY_ARRAY } from '../utils/bleConstants';
import { APP_DEFAULTS, CODE_TYPES } from '../utils/constants';
import { runTask } from '../utils/uiUtils';
import { CountCodesPacket } from '../ble/packets/StatusPackets';
import { useTaskContext } from './useTaskContext';
import { TaskType } from '../types/task';

export interface CodeMetadata {
  lastUsed?: Date;
  used?: boolean;
  usedDate?: Date;
}

export const useCodeLogic = (
  showNotification: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void,
  hideNotification: () => void
) => {
  const { t } = useTranslation(['codes', 'common'])
  const { activeDevice } = useDevice()
  const { codeCount } = useCodeCount()
  const { isConnected, sendRequest } = useBLEConnection()
  const { addTask } = useTaskContext()

  const codesQuery = useLiveQuery(
    async () => {
      if (!activeDevice?.id) return [];

      // Optimization: Only load relevant codes to reduce memory usage and sorting overhead
      // 1. Master codes (always needed)
      // 2. Active/Pending codes (always needed)
      // 3. Recent inactive codes (last 7 days history)
      const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
      const threshold = Date.now() - SEVEN_DAYS_MS;

      return db.codes
        .where('device_id')
        .equals(activeDevice.id)
        .filter((code) => {
          // Always keep master codes
          if (code.type === CODE_TYPES.MASTER) return true;

          // Keep active/pending codes
          if (
            code.status === CODE_STATUS.PENDING_ADD ||
            code.status === CODE_STATUS.ON_DEVICE ||
            code.status === 'synced' ||
            code.status === CODE_STATUS.PENDING_DELETE
          ) {
            return true;
          }

          // Keep recent history (based on updated_at)
          // If updated_at is missing, we assume it is old unless created_at is recent
          const lastUpdate = code.updated_at || new Date(code.created_at).getTime()
          return lastUpdate > threshold;
        })
        .toArray()
    },
    [activeDevice?.id]


  const codes = useMemo(() => (codesQuery ?? EMPTY_ARRAY) as BoksCode[], [codesQuery])

  const logsQuery = useLiveQuery(
    () => (activeDevice?.id ? db.logs.where('device_id').equals(activeDevice.id).toArray() : []),
    [activeDevice?.id]

  const logs = useMemo(() => (logsQuery ?? EMPTY_ARRAY) as BoksLog[], [logsQuery])

  // Derived counts
  const masterCodes = useMemo(() => codes.filter((c) => c.type === CODE_TYPES.MASTER), [codes])
  const temporaryCodes = useMemo(
    () => codes.filter((c) => c.type === CODE_TYPES.SINGLE || c.type === CODE_TYPES.MULTI),
    [codes]


  // Refresh code count from device
  const refreshCodeCount = useCallback(async () => {
    if (!isConnected) {
      showNotification(t('not_connected'), 'error')
      return;
    }

    await runTask(
      async () => {
        const response = await sendRequest(new CountCodesPacket())
        const packet = Array.isArray(response) ? response[0] : response;
        console.log(
          `[CodeManager] Response to 0x14 received: Opcode=0x${packet.opcode.toString(16)}, Payload=`,
          packet.payload
        )
        return packet;
      },
      {
        showNotification,
        hideNotification,
        loadingMsg: t('refresh_started'),
        successMsg: t('refresh_success'),
        errorMsg: t('refresh_failed'),
      }
    )
  }, [isConnected, sendRequest, showNotification, hideNotification, t])

  const sortCodesByPriority = useCallback((codes: BoksCode[]) => {
    // Helper function to get priority group
    const getPriority = (code: BoksCode) => {
      // Priority 1: Pending codes (PENDING_ADD, PENDING_DELETE)
      if (code.status === CODE_STATUS.PENDING_ADD || code.status === CODE_STATUS.PENDING_DELETE) {
        return 1;
      }
      // Priority 2: Active codes (ON_DEVICE and not used)
      if (code.status === CODE_STATUS.ON_DEVICE || code.status === 'synced') {
        // For single-use codes, check if they've been used
        if (code.type === CODE_TYPES.SINGLE) {
          // Note: We can't use deriveCodeMetadata here due to circular dependency
          // For now, we'll just check if it's a single-use code
        }
        // For multi-use codes, check if they've been fully used
        if (code.type === CODE_TYPES.MULTI) {
          // If uses >= maxUses, they're considered used (priority 3)
          if (
            code.uses !== undefined &&
            code.maxUses !== undefined &&
            code.uses >= code.maxUses
          ) {
            return 3;
          }
        }
        // Otherwise, they're active (priority 2)
        return 2;
      }
      // Priority 3: Used codes (default case)
      return 3;
    };

    return codes
      .map((code) => {
        const date = new Date(code.created_at).getTime()
        return {
          code,
          priority: getPriority(code),
          date: isNaN(date) ? -Infinity : date,
          isNaNDate: isNaN(date),
        };
      })
      .sort((a, b) => {
        // If priorities are different, sort by priority
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }

        // If priorities are the same, sort by creation date (descending - newest first)
        // Handle potential NaN values
        if (a.isNaNDate && b.isNaNDate) return 0;
        if (a.isNaNDate) return 1;
        if (b.isNaNDate) return -1;

        return b.date - a.date;
      })
      .map((item) => item.code)
  }, [])

  // Helper function to check for index conflicts in permanent codes
  const hasIndexConflict = useCallback(
    (index: number | undefined, currentCodeId: string) => {
      if (index === undefined) return false;
      return codes.some(
        (code) =>
          code.type === CODE_TYPES.MASTER && code.index === index && code.id !== currentCodeId
      )
    },
    [codes]


  const handleAddCode = useCallback(
    async (newCodeData: Partial<BoksCode>, overwriteCodeId: string | null = null) => {
      if (!activeDevice?.id) return;

      try {
        // If there's a code to overwrite, mark it for deletion
        if (overwriteCodeId) {
          const overwriteCode = await db.codes.get(overwriteCodeId)
          if (overwriteCode) {
            await StorageService.updateCodeStatus(
              activeDevice.id,
              overwriteCodeId,
              CODE_STATUS.PENDING_DELETE
            )
             addTask({
                type: TaskType.DELETE_CODE,
                deviceId: activeDevice.id,
                priority: 0,
                payload: {
                  code: overwriteCode.code,
                  codeId: overwriteCode.id,
                  codeType: overwriteCode.type,
                },
              })
          }
        }

        if (!newCodeData.code || !newCodeData.type) {
          throw new Error('Missing required code data')
        }

        // Create the new code entry (V2 Schema)
        const codeEntry: BoksCode = {
          id: crypto.randomUUID(),
          code: newCodeData.code,
          type: newCodeData.type,
          index: newCodeData.index,
          name: newCodeData.name || newCodeData.description || 'Code', // Adapt legacy fields
          created_at: new Date().toISOString(),
          status: CODE_STATUS.PENDING_ADD as CodeStatus,
          device_id: activeDevice.id,
          author_id: APP_DEFAULTS.AUTHOR_ID, // Default
          sync_status: 'created',
          // Pour les codes multi-usages, ajouter les propriétés uses et maxUses
          ...(newCodeData.type === CODE_TYPES.MULTI && {
            uses: 0,
            maxUses: newCodeData.maxUses || newCodeData.uses || 1, // Handle both potential property names
          }),
        };

        // Add the new code to the database
        await db.codes.add(codeEntry)

        // Add task for BLE sync
        let taskType: TaskType;
        switch (newCodeData.type) {
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
            taskType = TaskType.ADD_MASTER_CODE;
        }

        addTask({
          type: taskType,
          deviceId: activeDevice.id,
          priority: 1,
          payload: {
            code: codeEntry.code,
            codeId: codeEntry.id,
            // Include other payload fields if needed for specific task types
          },
        })

        showNotification(t('added'), 'success')
      } catch (error) {
        console.error('Failed to add code:', error)
        showNotification(t('add_failed'), 'error')
      }
    },
    [activeDevice?.id, showNotification, t, addTask]


  const handleDeleteCode = useCallback(
    async (id: string) => {
      if (!activeDevice?.id) return;

      try {
        const codeToDelete = await db.codes.get(id)

        await StorageService.updateCodeStatus(activeDevice.id, id, CODE_STATUS.PENDING_DELETE)

        if (codeToDelete) {
             addTask({
                type: TaskType.DELETE_CODE,
                deviceId: activeDevice.id,
                priority: 0,
                payload: {
                  code: codeToDelete.code,
                  codeId: codeToDelete.id,
                  codeType: codeToDelete.type,
                },
              })
        }

        showNotification(t('deleted'), 'success')
      } catch (error) {
        console.error('Failed to delete code:', error)
        showNotification(t('delete_failed'), 'error')
      }
    },
    [activeDevice?.id, showNotification, t, addTask]


  // Function to derive code metadata from logs
  const deriveCodeMetadata = useCallback(
    (code: BoksCode): CodeMetadata => {
      if (!logs || logs.length === 0) return {};

      if (code.type === CODE_TYPES.MASTER) {
        // Find the most recent log entry for this master code index
        const masterLogs = logs
          .filter((log) => {
            if (
              log.event === 'PIN_CODE_OPEN' &&
              typeof log.data === 'object' &&
              log.data !== null &&
              'index' in log.data
            ) {
              return (log.data as { index?: number }).index === code.index;
            }
            return false;
          })
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

        if (masterLogs.length > 0) {
          return { lastUsed: new Date(masterLogs[0].timestamp as string) };
        }
      } else if (code.type === CODE_TYPES.SINGLE) {
        // For single-use codes, we need to find a log entry that matches
        // This is a simplification - in reality, we might need more information in the logs
        const singleUseLogs = logs
          .filter((log) => log.event === 'SINGLE_USE_OPEN')
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

        // Check if any log is after the code creation date
        const codeCreationDate = new Date(code.created_at)
        const usedLog = singleUseLogs.find(
          (log) => new Date(log.timestamp as string) > codeCreationDate
        )

        if (usedLog) {
          return { used: true, usedDate: new Date(usedLog.timestamp as string) };
        }
      }

      return {};
    },
    [logs]


  // Get codes filtered by type with unified sorting
  const getFilteredCodes = useCallback(
    (type: string) => {
      if (type === CODE_TYPES.MASTER) {
        const filteredCodes = codes.filter((code) => code.type === type)
        // For master codes, we still sort by index but apply our priority sorting first
        const sortedByPriority = sortCodesByPriority(filteredCodes)
        // Then sort by index within each priority group
        return sortedByPriority.sort((a, b) => (a.index || 0) - (b.index || 0))
      } else {
        // Temporary codes (single and multi-use)
        // Get all temporary codes (single and multi)
        const temporaryCodes = codes.filter(
          (code) => code.type === CODE_TYPES.SINGLE || code.type === CODE_TYPES.MULTI
        )
        // Apply our priority sorting to the combined list
        return sortCodesByPriority(temporaryCodes)
      }
    },
    [codes, sortCodesByPriority]


  // Handle copying code to clipboard
  const handleCopyCode = useCallback(
    (codeValue: string) => {
      navigator.clipboard.writeText(codeValue).then(() => {
        showNotification(t('copied'), 'success')
      })
    },
    [showNotification, t]


  return {
    codes,
    logs,
    masterCodes,
    temporaryCodes,
    codeCount,
    refreshCodeCount,
    sortCodesByPriority,
    hasIndexConflict,
    handleAddCode,
    handleDeleteCode,
    deriveCodeMetadata,
    getFilteredCodes,
    handleCopyCode,
  };
};
