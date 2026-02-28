import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBLE } from '../hooks/useBLE';
import { useDevice } from '../hooks/useDevice';
import { StorageService } from '../services/StorageService';
import { BoksLog } from '../types';
import { BoksContext } from './Contexts';
import { useNavigate } from 'react-router-dom';
import { BoksOpcode } from '@thib3113/boks-sdk';

interface BoksProviderProps {
  children: ReactNode;
}

export const BoksProvider = ({ children }: BoksProviderProps) => {
  const navigate = useNavigate();
  const { log, addListener, removeListener, isConnected, device: bleDevice, controller } = useBLE();
  const { activeDevice, registerDevice } = useDevice();

  const [doorStatus, setDoorStatus] = useState<'open' | 'closed' | null>(null);
  const [isOpening, setIsOpening] = useState(false);
  const [isSynchronizing, setIsSynchronizing] = useState(false);
  const openTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronize door status from controller when connected
  useEffect(() => {
    if (isConnected && controller) {
      setDoorStatus(controller.doorOpen ? 'open' : 'closed');
    } else {
      setDoorStatus(null);
    }
  }, [isConnected, controller]);

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
      setIsOpening(false);
      setIsSynchronizing(false);
      if (openTimeoutRef.current) {
        clearTimeout(openTimeoutRef.current);
        openTimeoutRef.current = null;
      }
    }
  }, [isConnected]);

  // Handle door status notifications (using SDK controller for real-time updates)
  useEffect(() => {
    if (!controller) return;

    const unsub = controller.onPacket((packet) => {
      if (
        packet.opcode === BoksOpcode.NOTIFY_DOOR_STATUS ||
        packet.opcode === BoksOpcode.ANSWER_DOOR_STATUS
      ) {
        const isOpen = controller.doorOpen;
        const status = isOpen ? 'open' : 'closed';
        setDoorStatus(status);
        log(`Door status updated: ${status}`, 'info');

        if (isOpening) {
          setIsOpening(false);
          if (openTimeoutRef.current) {
            clearTimeout(openTimeoutRef.current);
            openTimeoutRef.current = null;
          }
        }
      }
    });

    return () => unsub();
  }, [controller, log, isOpening]);

  // Open the door with a code
  const openDoor = useCallback(
    async (code: string) => {
      if (code.length !== 6) {
        log('Code must be 6 characters', 'error');
        return;
      }

      if (!isConnected || !controller) {
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
          log('Code invalid', 'error');
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
    [isConnected, controller, log]
  );

  // Synchronize logs from Boks
  const syncLogs = useCallback(async () => {
    if (!isConnected || !activeDevice || !controller) {
      log('Cannot sync logs: Not connected or no active device', 'error');
      return;
    }

    setIsSynchronizing(true);
    log('Starting log synchronization...', 'info');

    try {
      // Use SDK's fetchHistory
      const history = await controller.fetchHistory();
      log(`Received ${history.length} log events. Saving...`, 'success');

      const logsToSave: Partial<BoksLog>[] = history.map((event: any) => ({
        deviceId: activeDevice.id,
        opcode: event.opcode || 0, // Fallback if opcode missing
        // Try to access raw payload if available on the event instance
        payload: event.payload ? new Uint8Array(event.payload as Uint8Array) : new Uint8Array(0),
        timestamp: event.date ? event.date.toISOString() : new Date().toISOString(),
        event: event.constructor.name || 'LogEvent',
        type: 'info',
        synced: false
      }));

      await StorageService.saveLogs(activeDevice.id, logsToSave as any);
      log('Logs saved successfully', 'success');
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      log(`Log sync failed: ${errorMessage}`, 'error');
    } finally {
      setIsSynchronizing(false);
    }
  }, [isConnected, activeDevice, controller, log]);

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

  // Synchronize logs from Boks
  const syncLogs = useCallback(async () => {
    if (!isConnected || !activeDevice || !controller) {
      log('Cannot sync logs: Not connected or no active device', 'error');
      return;
    }

    setIsSynchronizing(true);
    log('Starting log synchronization...', 'info');

    try {
      // Use SDK's fetchHistory
      const history = await controller.fetchHistory();
      log(`Received ${history.length} log events. Saving...`, 'success');

      const logsToSave: Partial<BoksLog>[] = history.map((event: any) => ({
        deviceId: activeDevice.id,
        opcode: event.opcode || 0, // Fallback if opcode missing
        // Try to access raw payload if available on the event instance
        payload: event.payload ? new Uint8Array(event.payload as Uint8Array) : new Uint8Array(0),
        timestamp: event.date ? event.date.toISOString() : new Date().toISOString(),
        event: event.constructor.name || 'LogEvent',
        type: 'info',
        synced: false
      }));

      await StorageService.saveLogs(activeDevice.id, logsToSave as any);
      log('Logs saved successfully', 'success');
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      log(`Log sync failed: ${errorMessage}`, 'error');
    } finally {
      setIsSynchronizing(false);
    }
  }, [isConnected, activeDevice, controller, log]);

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
