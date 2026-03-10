import { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useBLE } from '../../hooks/useBLE';
import { OPCODE_NAMES } from '../../utils/bleConstants';
import DeleteIcon from '@mui/icons-material/Delete';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { packetLogger } from '../../services/PacketLoggerService';

export const PacketLogger = () => {
  const { t } = useTranslation(['settings', 'common']);
  const { debugLogs, clearDebugLogs } = useBLE();
  const [openClearDialog, setOpenClearDialog] = useState(false);

  // Filter only packet logs, sort descending
  const packetLogs = debugLogs
    .filter((l) => l.type === 'packet')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const getOpcodeName = (opcode: number | undefined) => {
    if (opcode === undefined) return 'UNKNOWN';
    return OPCODE_NAMES[opcode] || `OP_${opcode.toString(16).toUpperCase()}`;
  };

  const handleExportLogs = async () => {
    try {
      const logs = await packetLogger.exportLogs();
      const blob = new Blob([logs], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `boks_packet_logs_${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to export logs', e);
      // Fallback alert if something goes wrong
      alert('Failed to export logs');
    }
  };

  const handleClearLogsConfirm = async () => {
    // Clear in-memory logs
    clearDebugLogs();
    // Clear persistent logs
    await packetLogger.clearLogs();
    setOpenClearDialog(false);
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">{t('settings:developer.packet_logger_title')}</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<FileDownloadIcon />}
            onClick={handleExportLogs}
            size="small"
          >
            {t('settings:developer.export_logs')}
          </Button>

          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => setOpenClearDialog(true)}
            size="small"
          >
            {t('settings:developer.clear_logs')}
          </Button>
        </Box>
      </Box>

      <Paper variant="outlined" sx={{ width: '100%', overflow: 'hidden' }}>
        <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell>Time</TableCell>
                <TableCell>Dir</TableCell>
                <TableCell>Opcode</TableCell>
                <TableCell>Payload (Hex)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {packetLogs.length > 0 ? (
                packetLogs.map((log) => (
                  <TableRow key={log.id} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
                      {new Date(log.timestamp).toLocaleTimeString([], {
                        hour12: false,
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        fractionalSecondDigits: 3
                      })}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={log.direction}
                        color={log.direction === 'TX' ? 'primary' : 'success'}
                        size="small"
                        sx={{ fontSize: '0.7rem', height: 20 }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.75rem', fontWeight: 'bold' }}>
                      {getOpcodeName(log.opcode)}
                    </TableCell>
                    <TableCell
                      sx={{ fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all' }}
                    >
                      {log.payload || '-'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                      {t('settings:developer.no_records')}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
      </Paper>

      {/* Confirmation Dialog */}
      <Dialog open={openClearDialog} onClose={() => setOpenClearDialog(false)}>
        <DialogTitle>{t('settings:developer.clear_logs')}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t('settings:developer.confirm_clear_logs')}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenClearDialog(false)} color="primary">
            {t('common:cancel')}
          </Button>
          <Button onClick={handleClearLogsConfirm} color="error" autoFocus>
            {t('settings:developer.clear_logs')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
