import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BLEPacket, parsePacket } from '../utils/packetParser';
import { LogContext } from './Contexts';
import { DebugPacket, LogEntry } from './types';

interface LogProviderProps {
  children: ReactNode;
}

export const LogProvider = ({ children }: LogProviderProps) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [debugLogs, setDebugLogs] = useState<DebugPacket[]>([]);

  // Buffer for high-frequency logs to prevent render flooding
  const pendingLogsRef = useRef<DebugPacket[]>([]);
  const flushTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Log a message
  const log = useCallback((msg: string, type: string = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prevLogs) => [...prevLogs, { timestamp, msg, type }]);
  }, []);

  // Add a debug log packet (optimized with buffering)
  const addDebugLog = useCallback((packet: DebugPacket) => {
    pendingLogsRef.current.push(packet);

    if (!flushTimeoutRef.current) {
      flushTimeoutRef.current = setTimeout(() => {
        // Capture and clear pending logs
        const newLogs = [...pendingLogsRef.current];
        pendingLogsRef.current = [];
        flushTimeoutRef.current = null;

        if (newLogs.length === 0) return;

        setDebugLogs((prev) => {
          // Reverse new logs to have newest first (since we pushed them in arrival order)
          // Example: [Older, Newer] -> [Newer, Older]
          const reversedNewLogs = newLogs.reverse();

          // Keep only the last 1000 packets to prevent memory issues but allow deeper debugging
          const updated = [...reversedNewLogs, ...prev];
          return updated.length > 1000 ? updated.slice(0, 1000) : updated;
        });
      }, 50); // 50ms buffer window (approx 20fps updates max)
    }
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current);
      }
    };
  }, []);

  // Clear all debug logs
  const clearDebugLogs = useCallback(() => {
    setDebugLogs([]);
    pendingLogsRef.current = [];
    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current);
      flushTimeoutRef.current = null;
    }
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
