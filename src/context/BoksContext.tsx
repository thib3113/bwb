import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBLE } from '../hooks/useBLE';
import { useDevice } from '../hooks/useDevice';
import { BLEOpcode } from '../utils/bleConstants';
import { BLEPacket } from '../utils/packetParser';
import { StorageService } from '../services/StorageService';
import { BoksLog } from '../types';
import { BoksContext } from './Contexts';
import { useNavigate } from 'react-router-dom';
import { BoksHistoryEvent } from '@thib3113/boks-sdk';

interface BoksProviderProps {
  children: ReactNode;
}

export const BoksProvider = ({ children }: BoksProviderProps) => {
  const navigate = useNavigate();
  const {
    controller,
    log,
    addListener,
    removeListener,
    isConnected,
    device: bleDevice
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
      registerDevice(bleDevice)
        .then((isNew) => {
          if (isNew) {
            log('New device detected, redirecting to settings...', 'info');
            navigate('/my-boks?tab=settings');
          }
        })
        .catch((err) => {
          log(`Failed to register/activate device: ${err.message}`, 'error');
        });
    }
  }, [isConnected, bleDevice, registerDevice, log, navigate]);

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

        if (isOpening) {
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

      if (openTimeoutRef.current) {
        clearTimeout(openTimeoutRef.current);
      }
      openTimeoutRef.current = setTimeout(() => {
        setIsOpening(false);
        openTimeoutRef.current = null;
        log('Door open timeout', 'warning');
      }, 120000); // 2 minutes

      try {
        const success = await controller.openDoor(code);

        if (success) {
            log('Code accepted', 'success');
        } else {
            log('Code invalid or operation failed', 'error');
            setIsOpening(false);
            if (openTimeoutRef.current) {
              clearTimeout(openTimeoutRef.current);
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
    [isConnected, log, controller]
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
      // Use SDK fetchHistory
      const historyEvents = await controller.fetchHistory();

      log(`Received ${historyEvents.length} log packets. Saving...`, 'success');

      // Convert BoksHistoryEvent to BoksLog objects
      const logsToSave: Partial<BoksLog>[] = historyEvents.map((event: BoksHistoryEvent) => {
          let payload = new Uint8Array(0);
          if ('toPayload' in event && typeof event.toPayload === 'function') {
              payload = event.toPayload();
          } else if ('payload' in event) {
              payload = (event as any).payload;
          }

          return {
              deviceId: activeDevice.id,
              opcode: (event as any).opcode,
              payload: payload,
              timestamp: event.date ? event.date.toISOString() : new Date().toISOString(),
              event: 'LOG_ENTRY',
              type: 'info',
              synced: false,
              // We can attach more data if available in event
              data: {
                  age: event.age
              }
          };
      });

      await StorageService.saveLogs(activeDevice.id, logsToSave);
      log('Logs saved successfully', 'success');

    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      log(`Log sync failed: ${errorMessage}`, 'error');
    } finally {
      setIsSynchronizing(false);
    }
  }, [isConnected, activeDevice, log, controller]);

  const value = useMemo(
    () => ({
      doorStatus,
      isOpening,
      openDoor,
      isSynchronizing,
      setIsSynchronizing,
      syncLogs
    }),
    [doorStatus, isOpening, isSynchronizing, openDoor, syncLogs]
  );

  return <BoksContext.Provider value={value}>{children}</BoksContext.Provider>;
};
