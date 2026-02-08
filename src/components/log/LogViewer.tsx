import { useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { db } from '../../db/db';
import { useDevice } from '../../hooks/useDevice';
import { useLogCount } from '../../hooks/useLogCount';
import { BoksLog } from '../../types';
import { parseLogs } from '../../utils/logParser';
import { LogItem, ParsedLogDisplay } from './LogItem';
import { useBLEConnection } from '../../hooks/useBLEConnection';
import { useBLELogs } from '../../hooks/useBLELogs';
import { EMPTY_ARRAY } from '../../utils/bleConstants';

import { runTask } from '../../utils/uiUtils';

interface LogViewerProps {
  showNotification: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  hideNotification: () => void;
}

export const LogViewer = ({ showNotification, hideNotification }: LogViewerProps) => {
  const { t, i18n } = useTranslation(['logs', 'common']);
  const { activeDevice } = useDevice();
  const { isConnected } = useBLEConnection();
  const { isSyncingLogs, requestLogs } = useBLELogs();
  const { logCount } = useLogCount();

  /**
   * Note on performance: High-volume optimization (like virtualization) is not implemented here
   * because Boks generates a low volume of logs (~300/year).
   * Simple mapping and filtering is sufficient for this scale.
   */

  // Load logs using useLiveQuery - sorted in descending order (newest first)
  const logsQuery = useLiveQuery(() => {
    const deviceId = activeDevice?.id;
    if (!deviceId) return [];
    console.log(`[LogViewer] Querying logs for device_id: ${deviceId}`);
    return db.logs
      .orderBy('timestamp')
      .reverse()
      .filter((log) => log.device_id === deviceId)
      .limit(50)
      .toArray();
  }, [activeDevice?.id]);

  const logs = useMemo(() => {
    const results = (logsQuery ?? EMPTY_ARRAY) as BoksLog[];
    console.log(`[LogViewer] raw logs count: ${results.length}`, results);
    return results;
  }, [logsQuery]);

  // Load NFC tags for mapping
  const nfcTags = useLiveQuery(() => {
    const deviceId = activeDevice?.id;
    if (!deviceId) return [];
    return db.nfc_tags.where('device_id').equals(deviceId).toArray();
  }, [activeDevice?.id]);

  // Parse logs using the new log parser utility
  // Optimized: Using useMemo instead of useEffect + useState to avoid double render.

  const parsedLogs = useMemo(() => {
    if (logs.length === 0) return [];

    try {
      console.log(`[LogViewer] Starting parseLogs with ${logs.length} logs`);
      const parsed: ParsedLogDisplay[] = parseLogs(logs).map((parsedLog) => {
        const date = new Date(parsedLog.timestamp);
        const fullDate = date.toLocaleString(i18n.language);

        // Map NFC details if available
        const details = { ...parsedLog.details };
        if (typeof details.tag_uid === 'string') {
          // 1. Map UID to Name
          const tag = nfcTags?.find((t) => t.uid === details.tag_uid);
          if (tag) {
            details.tag_uid = `${tag.name} (${details.tag_uid})`;
          }

          // 2. Map Tag Type to localized string
          if (details.tag_type !== undefined) {
            // 1, 2, 3 -> localized string
            details.tag_type = t(`nfc_tag_types.${details.tag_type}`);
          }
        }

        return {
          ...parsedLog,
          details,
          fullDate,
          event: t(parsedLog.description)
        };
      });

      console.log(`[LogViewer] Parsing finished. parsedLogs: ${parsed.length}`, parsed);
      return parsed;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(t('parse_error'), errorMessage);
      // Side effect (notification) removed from render phase.
      return [];
    }
  }, [logs, i18n.language, t, nfcTags]);

  // Refresh logs function

  const refreshLogs = useCallback(async () => {
    if (!isConnected) {
      if (showNotification) {
        showNotification(t('not_connected'), 'error');
      }
      return;
    }

    await runTask(requestLogs, {
      showNotification,
      hideNotification,
      loadingMsg: t('refresh_started'),
      successMsg: t('refresh_success'),
      errorMsg: t('refresh_failed')
    });
  }, [isConnected, requestLogs, showNotification, hideNotification, t]);

  return (
    <Box sx={{ p: 2, mb: 2, width: '100%' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" component="h2">
          {t('title')} {logCount !== null && logCount > 0 && `(${logCount})`}
        </Typography>
        <Button
          variant="outlined"
          startIcon={isSyncingLogs ? <CircularProgress size={20} /> : <RefreshIcon />}
          onClick={refreshLogs}
          disabled={!isConnected || isSyncingLogs}
        >
          {t('refresh')}
        </Button>
      </Box>

      {!isConnected && !activeDevice && logs.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('connect_to_view')}
        </Alert>
      )}

      <Box
        sx={{
          height: '100%',
          width: '100%',
          overflowY: 'auto',
          borderRadius: 1,
          p: 2,
          backgroundColor: 'background.paper',
          fontFamily: 'Courier New, monospace'
        }}
      >
        {parsedLogs.length > 0 ? (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('timestamp')}</TableCell>
                <TableCell>{t('event_label')}</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {parsedLogs.map((log, index) => (
                <LogItem key={index} log={log} />
              ))}
            </TableBody>
          </Table>
        ) : logs.length > 0 ? (
          <Box>
            {logs.map((log, index) => {
              const date = new Date(log.timestamp);
              const shortDate = date.toLocaleDateString(i18n.language, {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              });
              const fullDate = date.toLocaleString(i18n.language);

              return (
                <Box key={index} sx={{ py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography component="span" fontWeight="bold" title={fullDate}>
                    {shortDate}
                  </Typography>
                  : {log.event}
                </Box>
              );
            })}
          </Box>
        ) : (
          <Typography align="center" sx={{ fontStyle: 'italic', py: 2 }} component="p">
            {isConnected || activeDevice
              ? t('no_logs_when_connected')
              : t('no_logs_when_disconnected')}
          </Typography>
        )}
      </Box>
    </Box>
  );
};
