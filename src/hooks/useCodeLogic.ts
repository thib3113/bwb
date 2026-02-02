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
import { sortCodes } from '../utils/codeUtils';
import { CountCodesPacket } from '../ble/packets/StatusPackets';

export interface CodeMetadata {
  lastUsed?: Date;
  used?: boolean;
  usedDate?: Date;
}

export const useCodeLogic = (
  showNotification: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void,
  hideNotification: () => void
) => {
  const { t } = useTranslation(['codes', 'common']);
  const { activeDevice } = useDevice();
  const { codeCount } = useCodeCount();
  const { isConnected, sendRequest } = useBLEConnection();

  const codesQuery = useLiveQuery(
    () => (activeDevice?.id ? db.codes.where('device_id').equals(activeDevice.id).toArray() : []),
    [activeDevice?.id]
  );
  const codes = useMemo(() => (codesQuery ?? EMPTY_ARRAY) as BoksCode[], [codesQuery]);

  const logsQuery = useLiveQuery(
    () => (activeDevice?.id ? db.logs.where('device_id').equals(activeDevice.id).toArray() : []),
    [activeDevice?.id]
  );
  const logs = useMemo(() => (logsQuery ?? EMPTY_ARRAY) as BoksLog[], [logsQuery]);

  // Derived counts
  const masterCodes = useMemo(() => codes.filter((c) => c.type === CODE_TYPES.MASTER), [codes]);
  const temporaryCodes = useMemo(
    () => codes.filter((c) => c.type === CODE_TYPES.SINGLE || c.type === CODE_TYPES.MULTI),
    [codes]
  );

  // Refresh code count from device
  const refreshCodeCount = useCallback(async () => {
    if (!isConnected) {
      showNotification(t('not_connected'), 'error');
      return;
    }

    await runTask(
      async () => {
        const response = await sendRequest(new CountCodesPacket());
        const packet = Array.isArray(response) ? response[0] : response;
        console.log(
          `[CodeManager] Response to 0x14 received: Opcode=0x${packet.opcode.toString(16)}, Payload=`,
          packet.payload
        );
        return packet;
      },
      {
        showNotification,
        hideNotification,
        loadingMsg: t('refresh_started'),
        successMsg: t('refresh_success'),
        errorMsg: t('refresh_failed'),
      }
    );
  }, [isConnected, sendRequest, showNotification, hideNotification, t]);

  // Helper function to sort codes by priority and creation date
  const sortCodesByPriority = useCallback((codes: BoksCode[]) => {
    return sortCodes(codes);
  }, []);

  // Helper function to check for index conflicts in permanent codes
  const hasIndexConflict = useCallback(
    (index: number | undefined, currentCodeId: string) => {
      if (index === undefined) return false;
      return codes.some(
        (code) =>
          code.type === CODE_TYPES.MASTER && code.index === index && code.id !== currentCodeId
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
          await StorageService.updateCodeStatus(
            activeDevice.id,
            overwriteCodeId,
            CODE_STATUS.PENDING_DELETE
          );
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
        await db.codes.add(codeEntry);

        showNotification(t('added'), 'success');
      } catch (error) {
        console.error('Failed to add code:', error);
        showNotification(t('add_failed'), 'error');
      }
    },
    [activeDevice?.id, showNotification, t]
  );

  const handleDeleteCode = useCallback(
    async (id: string) => {
      if (!activeDevice?.id) return;

      try {
        await StorageService.updateCodeStatus(activeDevice.id, id, CODE_STATUS.PENDING_DELETE);
        showNotification(t('deleted'), 'success');
      } catch (error) {
        console.error('Failed to delete code:', error);
        showNotification(t('delete_failed'), 'error');
      }
    },
    [activeDevice?.id, showNotification, t]
  );

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
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        if (masterLogs.length > 0) {
          return { lastUsed: new Date(masterLogs[0].timestamp as string) };
        }
      } else if (code.type === CODE_TYPES.SINGLE) {
        // For single-use codes, we need to find a log entry that matches
        // This is a simplification - in reality, we might need more information in the logs
        const singleUseLogs = logs
          .filter((log) => log.event === 'SINGLE_USE_OPEN')
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        // Check if any log is after the code creation date
        const codeCreationDate = new Date(code.created_at);
        const usedLog = singleUseLogs.find(
          (log) => new Date(log.timestamp as string) > codeCreationDate
        );

        if (usedLog) {
          return { used: true, usedDate: new Date(usedLog.timestamp as string) };
        }
      }

      return {};
    },
    [logs]
  );

  // Get codes filtered by type with unified sorting
  const getFilteredCodes = useCallback(
    (type: string) => {
      if (type === CODE_TYPES.MASTER) {
        const filteredCodes = codes.filter((code) => code.type === type);
        // For master codes, we still sort by index but apply our priority sorting first
        const sortedByPriority = sortCodesByPriority(filteredCodes);
        // Then sort by index within each priority group
        return sortedByPriority.sort((a, b) => (a.index || 0) - (b.index || 0));
      } else {
        // Temporary codes (single and multi-use)
        // Get all temporary codes (single and multi)
        const temporaryCodes = codes.filter(
          (code) => code.type === CODE_TYPES.SINGLE || code.type === CODE_TYPES.MULTI
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
