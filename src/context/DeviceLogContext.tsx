import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBLEEvents } from '../hooks/useBLEEvents';
import { BLEPacket } from '../utils/packetParser';
import { StorageService } from '../services/StorageService';
import { useDevice } from '../hooks/useDevice';
import { parseLog } from '../utils/logParser';
import { useBLE } from '../hooks/useBLE';
import { BLEOpcode } from '../utils/bleConstants';
import { BoksLog } from '../types';
import { DeviceLogContext } from './Contexts';
import { checkDeviceVersion } from '../utils/version';
import { BoksHistoryEvent } from '@thib3113/boks-sdk';

export const DeviceLogProvider = ({ children }: { children: ReactNode }) => {
  const [isSyncingLogs, setIsSyncingLogs] = useState(false);
  const { activeDevice, refreshCodeCount } = useDevice();
  const { addListener, removeListener } = useBLEEvents();

  const { controller, log, isConnected } = useBLE();

  const lastReceivedLogCountRef = useRef<number | null>(null);

  const isSyncingRef = useRef(false);
  const hasAutoSyncedRef = useRef(false);

  // Check if we are in Simulator Mode
  const autoSyncEnabled = activeDevice?.auto_sync ?? false;
  // const isSimulator = typeof window !== 'undefined' && window.BOKS_SIMULATOR_ENABLED;

  // Global listener for log counts (can be spontaneous or requested)
  useEffect(() => {
    const handleLogCountPacket = (packet: BLEPacket) => {
      if (packet.opcode === BLEOpcode.NOTIFY_LOGS_COUNT && packet.payload.length >= 2) {
        const count = (packet.payload[1] << 8) | packet.payload[0]; // Little Endian
        if (lastReceivedLogCountRef.current === null || count > lastReceivedLogCountRef.current) {
          lastReceivedLogCountRef.current = count;
          console.log(`[DeviceLogContext] Updated lastReceivedLogCountRef (Quirk #3): ${count}`);
        }
      }
    };

    addListener(BLEOpcode.NOTIFY_LOGS_COUNT, handleLogCountPacket);
    return () => removeListener(BLEOpcode.NOTIFY_LOGS_COUNT, handleLogCountPacket);
  }, [addListener, removeListener]);

  const requestLogs = useCallback(async () => {
    if (activeDevice && checkDeviceVersion(activeDevice).isRestricted) {
      log('Log synchronization aborted due to restricted version.', 'warning');
      return;
    }

    if (isSyncingRef.current) {
      log('Log synchronization already in progress, skipping...', 'info');
      return;
    }

    if (!activeDevice?.id) return;

    try {
      isSyncingRef.current = true;
      setIsSyncingLogs(true);
      log('Requesting logs from device...', 'info');

      // Use SDK fetchHistory
      const historyEvents = await controller.fetchHistory();

      log(`Received ${historyEvents.length} log packets. Saving...`, 'success');

      // Convert and save
      const logsToSave: BoksLog[] = historyEvents.map((event: BoksHistoryEvent) => {
          let payload = new Uint8Array(0);
          if ('toPayload' in event && typeof event.toPayload === 'function') {
              payload = event.toPayload();
          } else if ('payload' in event) {
              payload = (event as any).payload;
          }

          // We parse it using existing logic to extract event details
          const rawEntry: Partial<BoksLog> = {
            timestamp: event.date ? event.date.toISOString() : new Date().toISOString(),
            opcode: (event as any).opcode,
            payload: payload,
            device_id: activeDevice.id
          };

          const fullBoksLog: BoksLog = {
            ...(rawEntry as unknown as BoksLog),
            event: 'BLE_PACKET', // Default, parseLog will refine
            type: 'info'
          };

          return parseLog(fullBoksLog);
      });

      if (logsToSave.length > 0) {
          await StorageService.saveLogs(activeDevice.id, logsToSave);
          log(`Saved ${logsToSave.length} logs`, 'success');
      }

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`Failed to request logs: ${errorMessage}`, 'error');
    } finally {
        isSyncingRef.current = false;
        setIsSyncingLogs(false);
    }
  }, [activeDevice, controller, log]);

  // Auto-import logs on connection if enabled
  useEffect(() => {
    if (activeDevice && checkDeviceVersion(activeDevice).isRestricted) {
      return;
    }

    if (isConnected && activeDevice && autoSyncEnabled && !hasAutoSyncedRef.current) {
      const timer = setTimeout(async () => {
        try {
          if (!isConnected || !activeDevice || hasAutoSyncedRef.current) return;
          if (checkDeviceVersion(activeDevice).isRestricted) return;

          hasAutoSyncedRef.current = true;

          if (refreshCodeCount) {
            console.log(`[DeviceLogContext] Auto-sync: executing refreshCodeCount() first`);
            await refreshCodeCount();
          }

          setTimeout(async () => {
            console.log(`[DeviceLogContext] Auto-sync: calling requestLogs()`);
            await requestLogs();
          }, 500);
        } catch (err: unknown) {
          console.error(`[DeviceLogContext] Auto-sync error:`, err);
        }
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
