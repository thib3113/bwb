import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Paper,
  Chip,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useBLE } from '../../hooks/useBLE';
import { BLEOpcode, OPCODE_NAMES } from '../../utils/bleConstants';
import DeleteIcon from '@mui/icons-material/Delete';

export const PacketLogger = () => {
  const { t } = useTranslation(['settings']);
  const { debugLogs, clearDebugLogs } = useBLE();

  // Filter only packet logs, sort descending
  const packetLogs = debugLogs
    .filter((l) => l.type === 'packet')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const getOpcodeName = (opcode: number | undefined) => {
    if (opcode === undefined) return 'UNKNOWN';
    return OPCODE_NAMES[opcode] || `OP_${opcode.toString(16).toUpperCase()}`;
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">{t('settings:developer.packet_logger_title')}</Typography>
        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={clearDebugLogs}
          size="small"
        >
          {t('settings:developer.clear_logs')}
        </Button>
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
                        fractionalSecondDigits: 3,
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
    </Box>
  );
};
