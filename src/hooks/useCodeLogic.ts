import { useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useState, useEffect } from 'react';
import { db } from '../db/db';
import { BoksCode, CODE_TYPE, CodeMetadata } from '../types';
import { APP_DEFAULTS } from '../utils/constants';
import { CODE_STATUS } from '../constants/codeStatus';
import { StorageService } from '../services/StorageService';
import { useTaskContext } from './useTaskContext';
import { TaskType } from '../types/task';
import { useBLE } from './useBLE';
import { useTranslation } from 'react-i18next';
import { useCodeCount } from './useCodeCount';
import { useDevice } from './useDevice';

export const useCodeLogic = (
  showNotification: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _hideNotification: () => void
) => {
  const { activeDevice } = useDevice();
  const deviceId = activeDevice?.id;
  useBLE();
  const { t } = useTranslation('codes');
  const { codeCount, refreshCodeCount } = useCodeCount();
  const { addTask } = useTaskContext();

  const codesData = useLiveQuery(
    () => (deviceId ? db.codes.where('device_id').equals(deviceId).toArray() : []),
    [deviceId]
  );

  const codes = useMemo(() => codesData || [], [codesData]);

  const logsData = useLiveQuery(
    () =>
      deviceId ? db.logs.where('device_id').equals(deviceId).reverse().sortBy('timestamp') : [],
    [deviceId]
  );

  const logs = useMemo(() => logsData || [], [logsData]);

  // Filter lists for different views
  const masterCodes = useMemo(() => codes.filter((c) => c.type === CODE_TYPE.MASTER), [codes]);

  const temporaryCodes = useMemo(
    () => codes.filter((c) => c.type === CODE_TYPE.SINGLE || c.type === CODE_TYPE.MULTI),
    [codes]
  );

  // Function to derive code metadata
  // Updated to use the 'usedAt' field which is now reliably set by StorageService during log sync
  const deriveCodeMetadata = useCallback(
    (code: BoksCode): CodeMetadata => {
      // Prioritize explicit 'usedAt' field
      if (code.usedAt) {
        const usedDate = new Date(code.usedAt);

        // Master codes should not be marked as 'used' even if they have a usedAt date
        if (code.type === CODE_TYPE.MASTER) {
          return {
            used: false,
            usedDate: usedDate,
            lastUsed: usedDate, // For consistency
          };
        }

        return {
          used: true,
          usedDate: usedDate,
          lastUsed: usedDate, // For consistency
        };
      }

      // Fallback: Legacy logic or check logs if 'usedAt' is missing
      if (!logs || logs.length === 0) return {};

      if (code.type === CODE_TYPE.MASTER) {
        // ... (Logic for master logs remains if needed, but master codes aren't usually 'used' once)
        // But maybe 'lastUsed' is useful for Master codes too
        // Find the most recent log entry for this master code index
        // TODO: Improve this with proper Opcode checks
      } else if (code.type === CODE_TYPE.SINGLE) {
        // Fallback for single use
        // ...
      }

      return {};
    },
    [logs]
  );

  const sortCodesByPriority = useCallback((codes: BoksCode[]) => {
    // Helper function to get priority group
    const getPriority = (code: BoksCode) => {
      // Priority 1: Pending codes (PENDING_ADD, PENDING_DELETE)
      if (code.status === CODE_STATUS.PENDING_ADD || code.status === CODE_STATUS.PENDING_DELETE) {
        return 1;
      }
      // Priority 2: Active codes (ON_DEVICE and not used)
      if (code.status === CODE_STATUS.ON_DEVICE || code.status === 'synced') {
        // Check explicit usedAt
        if (code.usedAt && code.type !== CODE_TYPE.MASTER) {
          return 3;
        }

        // For multi-use codes, check if they've been fully used
        if (code.type === CODE_TYPE.MULTI) {
          if (code.uses !== undefined && code.maxUses !== undefined && code.uses >= code.maxUses) {
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
        const date = new Date(code.created_at).getTime();
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
      .map((item) => item.code);
  }, []);

  // Helper function to check for index conflicts in permanent codes
  const hasIndexConflict = useCallback(
    (index: number | undefined, currentCodeId: string) => {
      if (index === undefined) return false;
      return codes.some(
        (code) =>
          code.type === CODE_TYPE.MASTER && code.index === index && code.id !== currentCodeId
      );
    },
    [codes]
  );

  const handleAddCode = useCallback(
    async (newCodeData: Partial<BoksCode>, overwriteCodeId: string | null = null) => {
      if (!activeDevice?.id) return;

      try {
        // If there's a code to overwrite, mark it for deletion
        if (overwriteCodeId) {
          const overwriteCode = await db.codes.get(overwriteCodeId);
          if (overwriteCode) {
            await StorageService.updateCodeStatus(
              activeDevice.id,
              overwriteCodeId,
              CODE_STATUS.PENDING_DELETE
            );
            addTask({
              type: TaskType.DELETE_CODE,
              deviceId: activeDevice.id,
              priority: 0,
              payload: {
                code: overwriteCode.code,
                codeId: overwriteCode.id,
                codeType: overwriteCode.type,
              },
            });
          }
        }

        if (!newCodeData.code || !newCodeData.type) {
          throw new Error('Missing required code data');
        }

        // Create the new code entry (V2 Schema)
        const codeEntry: BoksCode = {
          id: crypto.randomUUID(),
          code: newCodeData.code,
          type: newCodeData.type,
          index: newCodeData.index,
          name: newCodeData.name || newCodeData.description || 'Code', // Adapt legacy fields
          created_at: new Date().toISOString(),
          status: CODE_STATUS.PENDING_ADD,
          device_id: activeDevice.id,
          author_id: APP_DEFAULTS.AUTHOR_ID, // Default
          sync_status: 'created',
          // Pour les codes multi-usages, ajouter les propriétés uses et maxUses
          ...(newCodeData.type === CODE_TYPE.MULTI && {
            uses: 0,
            maxUses: newCodeData.maxUses || newCodeData.uses || 1, // Handle both potential property names
          }),
        };

        // Add the new code to the database
        await db.codes.add(codeEntry);

        // Add task for BLE sync
        let taskType: TaskType;
        switch (newCodeData.type) {
          case CODE_TYPE.MASTER:
            taskType = TaskType.ADD_MASTER_CODE;
            break;
          case CODE_TYPE.SINGLE:
            taskType = TaskType.ADD_SINGLE_USE_CODE;
            break;
          case CODE_TYPE.MULTI:
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
            index: codeEntry.index, // Required for Master Code operations
          },
        });

        showNotification(t('added'), 'success');
      } catch (error) {
        console.error('Failed to add code:', error);
        showNotification(t('add_failed'), 'error');
      }
    },
    [activeDevice?.id, showNotification, t, addTask]
  );

  const handleDeleteCode = useCallback(
    async (id: string) => {
      if (!activeDevice?.id) return;

      try {
        const codeToDelete = await db.codes.get(id);

        await StorageService.updateCodeStatus(activeDevice.id, id, CODE_STATUS.PENDING_DELETE);

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
          });
        }

        showNotification(t('deleted'), 'success');
      } catch (error) {
        console.error('Failed to delete code:', error);
        showNotification(t('delete_failed'), 'error');
      }
    },
    [activeDevice?.id, showNotification, t, addTask]
  );

  // Get codes filtered by type with unified sorting
  const getFilteredCodes = useCallback(
    (type: string) => {
      if (type === CODE_TYPE.MASTER) {
        const filteredCodes = codes.filter((code) => code.type === type);
        // For master codes, we still sort by index but apply our priority sorting first
        const sortedByPriority = sortCodesByPriority(filteredCodes);
        // Then sort by index within each priority group
        return sortedByPriority.sort((a, b) => (a.index || 0) - (b.index || 0));
      } else {
        // Temporary codes (single and multi-use)
        // Get all temporary codes (single and multi)
        const temporaryCodes = codes.filter(
          (code) => code.type === CODE_TYPE.SINGLE || code.type === CODE_TYPE.MULTI
        );
        // Apply our priority sorting to the combined list
        return sortCodesByPriority(temporaryCodes);
      }
    },
    [codes, sortCodesByPriority]
  );

  // Handle copying code to clipboard
  const handleCopyCode = useCallback(
    (codeValue: string) => {
      navigator.clipboard.writeText(codeValue).then(() => {
        showNotification(t('copied'), 'success');
      });
    },
    [showNotification, t]
  );

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
