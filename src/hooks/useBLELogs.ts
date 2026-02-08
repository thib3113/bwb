import { useBLE } from './useBLE';
import { useDeviceLogContext } from './useDeviceLogContext';

export const useBLELogs = () => {
  const { logs, debugLogs, addDebugLog, clearDebugLogs, log } = useBLE();

  const { isSyncingLogs, requestLogs } = useDeviceLogContext();

  return {
    logs,
    debugLogs,
    isSyncingLogs,
    requestLogs,
    addDebugLog,
    clearDebugLogs,
    log
  };
};
