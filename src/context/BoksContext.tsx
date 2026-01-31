import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBLE } from '../hooks/useBLE';
import { useDevice } from '../hooks/useDevice';
import { BLEOpcode } from '../utils/bleConstants';
import { BLEPacket } from '../utils/packetParser';
import { StorageService } from '../services/StorageService';
import { BoksLog } from '../types';
import { BoksContext } from './Contexts';

interface BoksProviderProps {
  children: ReactNode;
}

export const BoksProvider = ({ children }: BoksProviderProps) => {
  const {
    sendRequest,
    log,
    addListener,
    removeListener,
    isConnected,
    device: bleDevice,
  } = useBLE();
  const { activeDevice, registerDevice } = useDevice();

  const [doorStatus, setDoorStatus] = useState<'open' | 'closed' | null>(null);
  const [isOpening, setIsOpening] = useState(false);
  const [isSynchronizing, setIsSynchronizing] = useState(false);
  const openTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync Active Device with BLE Connection
  useEffect(() => {
    if (isConnected && bleDevice) {
      log(`Syncing active device: ${bleDevice.name || bleDevice.id}`, 'info');
      registerDevice(bleDevice).catch((err) => {
        log(`Failed to register/activate device: ${err.message}`, 'error');
      });
    }
  }, [isConnected, bleDevice, registerDevice, log]);

  // Reset state on disconnect
  useEffect(() => {
    if (!isConnected) {
      setDoorStatus(null);
      setIsOpening(false);
      setIsSynchronizing(false);
      if (openTimeoutRef.current) {
        clearTimeout(openTimeoutRef.current);
        openTimeoutRef.current = null;
      }
    }
  }, [isConnected]);

  // Handle door status notifications
  useEffect(() => {
    const handleDoorStatus = (packet: BLEPacket) => {
      // Expected format from Python: [Opcode, Len, Inverted, Live, Checksum]
      // packet.payload contains [Inverted, Live] (Len=2)

      if (packet.isValidChecksum === false) {
        log(`Door status packet checksum error`, 'error');
        return;
      }

      if (packet.payload.length >= 2) {
        const inverted = packet.payload[0];
        const live = packet.payload[1];

        const isOpen = live === 0x01;
        const status = isOpen ? 'open' : 'closed';
        setDoorStatus(status);
        log(`Door status: ${status} (Inv: ${inverted}, Live: ${live})`, 'info');

        // If door closes, reset isOpening
        if (status === 'closed' && isOpening) {
          setIsOpening(false);
          if (openTimeoutRef.current) {
            clearTimeout(openTimeoutRef.current);
            openTimeoutRef.current = null;
          }
        }
      } else {
        log(
          `Malformed door status packet: insufficient data (len=${packet.payload.length})`,
          'warning'
        );
      }
    };

    addListener(BLEOpcode.NOTIFY_DOOR_STATUS, handleDoorStatus);
    addListener(BLEOpcode.ANSWER_DOOR_STATUS, handleDoorStatus);
    return () => {
      removeListener(BLEOpcode.NOTIFY_DOOR_STATUS, handleDoorStatus);
      removeListener(BLEOpcode.ANSWER_DOOR_STATUS, handleDoorStatus);
    };
  }, [addListener, removeListener, log, isOpening]);

  // Open the door with a code
  const openDoor = useCallback(
    async (code: string) => {
      if (code.length !== 6) {
        log('Code must be 6 characters', 'error');
        return;
      }

      if (!isConnected) {
        log('Not connected to any Boks', 'error');
        return;
      }

      setIsOpening(true);

      // Set timeout
      if (openTimeoutRef.current) {
        clearTimeout(openTimeoutRef.current);
      }
      openTimeoutRef.current = setTimeout(() => {
        setIsOpening(false);
        openTimeoutRef.current = null;
        log('Door open timeout', 'warning');
      }, 120000); // 2 minutes

      // Prepare payload
      const payload = new Uint8Array(6);
      for (let i = 0; i < 6; i++) {
        payload[i] = code.charCodeAt(i);
      }

      try {
        const response = await sendRequest(BLEOpcode.OPEN_DOOR, payload);

        if (!Array.isArray(response)) {
          if (response.opcode === BLEOpcode.VALID_OPEN_CODE) {
            log('Code accepted', 'success');
          } else if (response.opcode === BLEOpcode.INVALID_OPEN_CODE) {
            log('Code invalid', 'error');
            setIsOpening(false);
            if (openTimeoutRef.current) {
              clearTimeout(openTimeoutRef.current);
            }
          } else {
            log(`Unexpected response for OPEN_DOOR: ${response.opcode.toString(16)}`, 'warning');
          }
        }
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        log(`Failed to open door: ${errorMessage}`, 'error');
        setIsOpening(false);
        if (openTimeoutRef.current) {
          clearTimeout(openTimeoutRef.current);
        }
      }
    },
    [isConnected, log, sendRequest]
  );

  // Synchronize logs from Boks
  const syncLogs = useCallback(async () => {
    if (!isConnected || !activeDevice) {
      log('Cannot sync logs: Not connected or no active device', 'error');
      return;
    }

    setIsSynchronizing(true);
    log('Starting log synchronization...', 'info');

    try {
      // Define Log Opcodes to capture
      const logOpcodes = [
        BLEOpcode.LOG_CODE_BLE_VALID_HISTORY,
        BLEOpcode.LOG_CODE_KEY_VALID_HISTORY,
        BLEOpcode.LOG_CODE_BLE_INVALID_HISTORY,
        BLEOpcode.LOG_CODE_KEY_INVALID_HISTORY,
        BLEOpcode.LOG_DOOR_CLOSE_HISTORY,
        BLEOpcode.LOG_DOOR_OPEN_HISTORY,
        BLEOpcode.LOG_EVENT_SCALE_MEASURE,
        BLEOpcode.LOG_EVENT_KEY_OPENING,
        BLEOpcode.LOG_EVENT_ERROR,
        BLEOpcode.LOG_EVENT_NFC_OPENING,
        BLEOpcode.LOG_EVENT_NFC_REGISTERING,
      ];

      // Request logs and wait for stream end
      const packets = await sendRequest(BLEOpcode.REQUEST_LOGS, new Uint8Array(0), {
        timeout: 60000, // 60s max for full sync
        strategy: (packet) => {
          if (packet.opcode === BLEOpcode.LOG_END_HISTORY) return 'finish';
          if (logOpcodes.includes(packet.opcode)) return 'continue';
          return 'ignore';
        },
      });

      if (Array.isArray(packets)) {
        log(`Received ${packets.length} log packets. Saving...`, 'success');

        // Convert BLEPackets to BoksLog objects
        const logsToSave: Partial<BoksLog>[] = packets.map((p) => ({
          deviceId: activeDevice.id, // Use UUID from activeDevice
          opcode: p.opcode,
          payload: p.payload,
          timestamp: new Date().toISOString(), // Actual timestamp should be parsed from payload
          event: 'LOG_ENTRY',
          type: 'info',
          synced: false,
        }));

        await StorageService.saveLogs(activeDevice.id, logsToSave);
        log('Logs saved successfully', 'success');
      } else {
        log('Log sync returned unexpected single packet', 'warning');
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      log(`Log sync failed: ${errorMessage}`, 'error');
    } finally {
      setIsSynchronizing(false);
    }
  }, [isConnected, activeDevice, log, sendRequest]);

  const value = useMemo(
    () => ({
      doorStatus,
      isOpening,
      openDoor,
      isSynchronizing,
      setIsSynchronizing,
      syncLogs,
    }),
    [doorStatus, isOpening, isSynchronizing, openDoor, syncLogs]
  );

  return <BoksContext.Provider value={value}>{children}</BoksContext.Provider>;
};
