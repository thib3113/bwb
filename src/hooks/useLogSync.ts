import { useEffect, useRef, useState } from 'react';
import { useDevice } from './useDevice';
import { StorageService } from '../services/StorageService';
import { BLEPacket } from '../utils/packetParser';
import { parseLog } from '../utils/logParser';
import { useBLEConnection } from './useBLEConnection';
import { useBLEEvents } from './useBLEEvents';
import { BoksLog } from '../types';
import { BLEOpcode } from '../utils/bleConstants';

export const useLogSync = () => {
  const [syncing, setSyncing] = useState(false);
  const logsBufferRef = useRef<BoksLog[]>([]);
  const { isConnected } = useBLEConnection();
  const { activeDevice } = useDevice();
  const { addListener, removeListener } = useBLEEvents();

  useEffect(() => {
    if (!isConnected || !activeDevice) {
      if (syncing) {
        setTimeout(() => setSyncing(false), 0);
      }
      return;
    }

    const handlePacket = (packet: BLEPacket) => {
      // If END_LOG (0x92)
      if (packet.opcode === BLEOpcode.LOG_END) {
        console.log('End of Log received, saving logs...');
        if (logsBufferRef.current.length > 0 && activeDevice?.id) {
          StorageService.saveLogs(activeDevice.id, logsBufferRef.current)
            .then(() => console.log('Logs saved successfully'))
            .catch((err) => console.error('Failed to save logs', err));
        }
        setSyncing(false);
        return;
      }

      // If LOGS_COUNT (0x79)
      if (packet.opcode === BLEOpcode.NOTIFY_LOGS_COUNT) {
        // Check if there are logs to retrieve
        if (packet.payload.length >= 2) {
          const count = (packet.payload[0] << 8) | packet.payload[1];
          if (count > 0) {
            setSyncing(true);
            logsBufferRef.current = []; // Clear buffer
            return;
          }
        }
        // If no logs or invalid count, stop syncing
        setSyncing(false);
        return;
      }

      // For other packets, try to parse as log
      // We construct a raw log entry from the packet
      if (syncing) {
        const rawEntry: Partial<BoksLog> = {
          timestamp: new Date().toISOString(),
          opcode: packet.opcode,
          payload: packet.payload, // Uint8Array
          device_id: activeDevice.id,
        };
        const fullBoksLog: BoksLog = {
          ...(rawEntry as unknown as BoksLog),
          event: 'BLE_PACKET', // Placeholder event
          type: 'info', // Placeholder type
          synced: false,
          updated_at: Date.now(),
        };

        const parsed = parseLog(fullBoksLog);

        // Only add if it's a recognized log event (not unknown/error, unless it's a specific error log)
        // parseLog returns type='unknown' for unmapped opcodes
        if (parsed.eventType !== 'unknown') {
          logsBufferRef.current.push(parsed);
        }
      }
    };

    addListener('*', handlePacket);

    return () => {
      removeListener('*', handlePacket);
    };
  }, [isConnected, activeDevice, addListener, removeListener, syncing]);

  return { syncing };
};
