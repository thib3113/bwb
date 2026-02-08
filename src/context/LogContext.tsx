import { ReactNode, useCallback, useMemo, useState } from 'react';
import { BLEPacket, parsePacket } from '../utils/packetParser';
import { LogContext } from './Contexts';
import { DebugPacket, LogEntry } from './types';

interface LogProviderProps {
  children: ReactNode;
}

export const LogProvider = ({ children }: LogProviderProps) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [debugLogs, setDebugLogs] = useState<DebugPacket[]>([]);

  // Log a message
  const log = useCallback((msg: string, type: string = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prevLogs) => [...prevLogs, { timestamp, msg, type }]);
  }, []);

  // Add a debug log packet
  const addDebugLog = useCallback((packet: DebugPacket) => {
    setDebugLogs((prev) => {
      // Keep only the last 1000 packets to prevent memory issues but allow deeper debugging
      const updated = [packet, ...prev];
      return updated.length > 1000 ? updated.slice(0, 1000) : updated;
    });
  }, []);

  // Clear all debug logs
  const clearDebugLogs = useCallback(() => {
    setDebugLogs([]);
  }, []);

  // Parse logs to extract useful information
  const parseLog = useCallback((data: DataView): BLEPacket | null => {
    try {
      return parsePacket(data);
    } catch (error) {
      console.error('Error parsing log:', error);
      return null;
    }
  }, []);

  const value = useMemo(
    () => ({
      logs,
      debugLogs,
      log,
      addDebugLog,
      clearDebugLogs,
      parseLog
    }),
    [logs, debugLogs, log, addDebugLog, clearDebugLogs, parseLog]
  );

  return <LogContext.Provider value={value}>{children}</LogContext.Provider>;
};
