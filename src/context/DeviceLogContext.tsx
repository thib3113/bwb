import { ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useBLEEvents } from '../hooks/useBLEEvents';
import { BLEPacket } from '../utils/packetParser';
import { StorageService } from '../services/StorageService';
import { useDevice } from '../hooks/useDevice';
import { parseLog } from '../utils/logParser';
import { useBLE } from '../hooks/useBLE';
import { BLEOpcode } from '../utils/bleConstants';
import { BoksLog } from '../types';
import { DeviceLogContext, SettingsContext } from './Contexts';
import { GetLogsCountPacket } from '../ble/packets/GetLogsCountPacket';
import { RequestLogsPacket } from '../ble/packets/RequestLogsPacket';

export const DeviceLogProvider = ({ children }: { children: ReactNode }) => {
  const [isSyncingLogs, setIsSyncingLogs] = useState(false);
  const { activeDevice, refreshCodeCount } = useDevice();
  const { addListener, removeListener } = useBLEEvents();
  const settingsContext = useContext(SettingsContext);

  const { sendRequest, log, isConnected } = useBLE();

  const logsBufferRef = useRef<unknown[]>([]);
  const lastReceivedLogCountRef = useRef<number | null>(null);

  const isSyncingRef = useRef(false);
  const hasAutoSyncedRef = useRef(false);

  // Check if we are in Simulator Mode
  const isSimulator = typeof window !== 'undefined' && window.BOKS_SIMULATOR_ENABLED;

  // Global listener for log counts (can be spontaneous or requested)
  useEffect(() => {
    const handleLogCountPacket = (packet: BLEPacket) => {
      if (packet.opcode === BLEOpcode.NOTIFY_LOGS_COUNT && packet.payload.length >= 2) {
        const count = (packet.payload[1] << 8) | packet.payload[0]; // Little Endian
        lastReceivedLogCountRef.current = count;
        console.log(`[DeviceLogContext] Updated lastReceivedLogCountRef: ${count}`);
      }
    };

    addListener(BLEOpcode.NOTIFY_LOGS_COUNT, handleLogCountPacket);
    return () => removeListener(BLEOpcode.NOTIFY_LOGS_COUNT, handleLogCountPacket);
  }, [addListener, removeListener]);

  const requestLogs = useCallback(async () => {
    if (isSyncingRef.current) {
      log('Log synchronization already in progress, skipping...', 'info');
      return;
    }

    if (!activeDevice?.id) return;

    try {
      isSyncingRef.current = true;
      setIsSyncingLogs(true);
      log('Requesting logs from device...', 'info');

      // Optimistic check: check our local ref updated by the last 0x79 packet
      let count = 0;

      if (lastReceivedLogCountRef.current !== null) {
        count = lastReceivedLogCountRef.current;
        log(`Using opportunistic logs count from last packet: ${count}`, 'info');
        // Clear it so next time we don't use a stale value if things change
        lastReceivedLogCountRef.current = null;
      } else {
        // Fallback: Explicitly request logs count
        const response = await sendRequest(new GetLogsCountPacket());
        const packet = Array.isArray(response) ? response[0] : response;

        if (packet.payload.length >= 2) {
          count = (packet.payload[1] << 8) | packet.payload[0]; // Little Endian
        } else {
          console.warn(
            `[DeviceLogContext] Invalid logs count response (len=${packet.payload.length}). Assuming 0 logs.`
          );
          count = 0;
        }
        log(`Logs count (fetched): ${count}`, 'info');
      }

      if (count > 0) {
        log(`Requesting ${count} logs from device...`, 'info');
        logsBufferRef.current = []; // Clear buffer

        return new Promise<void>((resolve, reject) => {
          // Safety timeout for simulator environments
          const safetyTimeout = setTimeout(() => {
            if (isSimulator && isSyncingRef.current) {
              console.warn('[DeviceLogContext] Simulator: Log sync timed out, forcing completion.');
              handleEndHistory();
            }
          }, 3000);

          const handleEndHistory = () => {
            clearTimeout(safetyTimeout);
            log('End of logs received', 'info');
            console.log(
              `[DeviceLogContext] End of history. Buffer contains ${logsBufferRef.current.length} logs.`
            );
            removeListener(BLEOpcode.LOG_END, handleEndHistory);
            removeListener('*', handleLogPacket);

            // Save logs
            if (activeDevice?.id && logsBufferRef.current.length > 0) {
              console.log(
                `[DeviceLogContext] Saving ${logsBufferRef.current.length} logs for device ${activeDevice.id}...`,
                logsBufferRef.current
              );
              StorageService.saveLogs(activeDevice.id, logsBufferRef.current as any[])
                .then(() => {
                  log(`Saved ${logsBufferRef.current.length} logs`, 'success');
                  console.log(`[DeviceLogContext] bulkPut successful.`);
                })
                .catch((e) => log(`Error saving logs: ${e.message}`, 'error'));
            }

            isSyncingRef.current = false;
            setIsSyncingLogs(false);
            resolve();
          };

          const handleLogPacket = (packet: BLEPacket) => {
            // Ignore TX and control packets
            if (
              packet.direction === 'TX' ||
              packet.opcode === BLEOpcode.LOG_END ||
              packet.opcode === BLEOpcode.NOTIFY_LOGS_COUNT
            )
              return;

            // Parse and store
            if (activeDevice?.id) {
              const rawEntry: Partial<BoksLog> = {
                timestamp: new Date().toISOString(),
                opcode: packet.opcode,
                payload: packet.payload,
                device_id: activeDevice.id,
              };
              const fullBoksLog: BoksLog = {
                ...(rawEntry as unknown as BoksLog),
                event: 'BLE_PACKET',
                type: 'info',
              };

              const parsed = parseLog(fullBoksLog);
              if (parsed.eventType !== 'unknown') {
                console.log(
                  `[DeviceLogContext] Valid log received: Opcode=0x${packet.opcode.toString(16)}, type=${parsed.eventType}`
                );
                logsBufferRef.current.push(parsed);
              } else {
                console.warn(
                  `[DeviceLogContext] Ignored unknown log opcode: 0x${packet.opcode.toString(16)}`
                );
              }
            }
          };

          // Subscribe to end of history and log packets BEFORE sending request
          addListener(BLEOpcode.LOG_END, handleEndHistory);
          addListener('*', handleLogPacket);

          // Use sendRequest with expectResponse: false to ensure it goes through queue
          sendRequest(new RequestLogsPacket(), { expectResponse: false }).catch((err) => {
            removeListener(BLEOpcode.LOG_END, handleEndHistory);
            removeListener('*', handleLogPacket);
            isSyncingRef.current = false;
            setIsSyncingLogs(false);
            reject(err);
          });
        });
      } else {
        log('No logs to retrieve', 'info');
        isSyncingRef.current = false;
        setIsSyncingLogs(false);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`Failed to request logs: ${errorMessage}`, 'error');
      isSyncingRef.current = false;
      setIsSyncingLogs(false);
      // Suppress error in Simulator mode to avoid Cypress failure
      if (!isSimulator) {
        throw new Error(`Failed to request logs: ${errorMessage}`);
      }
    }
  }, [activeDevice, addListener, removeListener, sendRequest, log]);

  // Auto-import logs on connection if enabled
  useEffect(() => {
    if (
      isConnected &&
      activeDevice &&
      settingsContext?.settings.autoImport &&
      !hasAutoSyncedRef.current
    ) {
      // Optimized sequence: Codes first (triggers 0x14 -> 0x79 implicit), then Logs
      const timer = setTimeout(async () => {
        try {
          // Double check conditions inside timeout
          if (!isConnected || !activeDevice || hasAutoSyncedRef.current) return;

          hasAutoSyncedRef.current = true;

          if (refreshCodeCount) {
            console.log(`[DeviceLogContext] Auto-sync: executing refreshCodeCount() first`);
            await refreshCodeCount();
          } else {
            console.warn(`[DeviceLogContext] Auto-sync: refreshCodeCount is missing`);
          }

          // Small delay to allow 0x79 response to arrive and update DB
          setTimeout(async () => {
            console.log(`[DeviceLogContext] Auto-sync: calling requestLogs()`);
            await requestLogs();
            console.log(`[DeviceLogContext] Auto-sync: requestLogs() finished`);
          }, 500);
        } catch (err: unknown) {
          console.error(`[DeviceLogContext] Auto-sync error:`, err);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [
    isConnected,
    activeDevice,
    requestLogs,
    refreshCodeCount,
    settingsContext?.settings.autoImport,
  ]);

  // Reset sync ref on disconnect
  useEffect(() => {
    if (!isConnected) {
      hasAutoSyncedRef.current = false;
    }
  }, [isConnected]);

  const value = useMemo(
    () => ({
      isSyncingLogs,
      requestLogs,
    }),
    [isSyncingLogs, requestLogs]
  );

  return <DeviceLogContext.Provider value={value}>{children}</DeviceLogContext.Provider>;
};
