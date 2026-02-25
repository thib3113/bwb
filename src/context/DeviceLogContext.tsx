import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StorageService } from '../services/StorageService';
import { useDevice } from '../hooks/useDevice';
import { useBLE } from '../hooks/useBLE';
import { BoksLog } from '../types';
import { DeviceLogContext } from './Contexts';
import { checkDeviceVersion } from '../utils/version';

export const DeviceLogProvider = ({ children }: { children: ReactNode }) => {
  const [isSyncingLogs, setIsSyncingLogs] = useState(false);
  const { activeDevice, refreshCodeCount } = useDevice();
  const { controller, isConnected, log } = useBLE();

  const hasAutoSyncedRef = useRef(false);

  const autoSyncEnabled = activeDevice?.auto_sync ?? false;

  const requestLogs = useCallback(async () => {
    if (!activeDevice || !controller) return;

    // Check version restriction
    if (checkDeviceVersion(activeDevice).isRestricted) {
      log('Log synchronization aborted due to restricted version.', 'warning');
      return;
    }

    if (isSyncingLogs) {
      log('Log synchronization already in progress, skipping...', 'info');
      return;
    }

    try {
      setIsSyncingLogs(true);
      log('Requesting logs from device (SDK)...', 'info');

      // Use SDK High Level
      const history = await controller.fetchHistory();

      log(`Received ${history.length} logs. Saving...`, 'success');

      if (history.length > 0) {
        const logsToSave: Partial<BoksLog>[] = history.map((event: any) => ({
          deviceId: activeDevice.id,
          opcode: event.opcode || 0,
          payload: event.payload ? new Uint8Array(event.payload as Uint8Array) : new Uint8Array(0),
          timestamp: event.date ? event.date.toISOString() : new Date().toISOString(),
          event: event.constructor.name || 'LogEvent',
          type: 'info',
          synced: false
        }));

        await StorageService.saveLogs(activeDevice.id, logsToSave as any);
        log(`Saved ${history.length} logs`, 'success');
      } else {
        log('No logs to save', 'info');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`Failed to request logs: ${errorMessage}`, 'error');
    } finally {
      setIsSyncingLogs(false);
    }
  }, [activeDevice, controller, log, isSyncingLogs]);

  // Auto-import logs on connection if enabled
  useEffect(() => {
    if (activeDevice && checkDeviceVersion(activeDevice).isRestricted) {
      return;
    }

    if (isConnected && activeDevice && autoSyncEnabled && !hasAutoSyncedRef.current) {
      const timer = setTimeout(async () => {
        if (!isConnected || !activeDevice || hasAutoSyncedRef.current) return;

        hasAutoSyncedRef.current = true;

        if (refreshCodeCount) {
          await refreshCodeCount();
        }

        // Delay log sync slightly to avoid congestion if any
        setTimeout(async () => {
          await requestLogs();
        }, 500);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isConnected, activeDevice, requestLogs, refreshCodeCount, autoSyncEnabled]);

  // Reset sync ref on disconnect
  useEffect(() => {
    if (!isConnected) {
      hasAutoSyncedRef.current = false;
    }
  }, [isConnected]);

  const value = useMemo(
    () => ({
      isSyncingLogs,
      requestLogs
    }),
    [isSyncingLogs, requestLogs]
  );

  return <DeviceLogContext.Provider value={value}>{children}</DeviceLogContext.Provider>;
};
