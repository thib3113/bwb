import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Chip,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Snackbar,
  Tooltip,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useBLELogs } from '../hooks/useBLELogs';
import {
  BATTERY_LEVEL_CHAR_UUID,
  BATTERY_PROPRIETARY_CHAR_UUID,
  BATTERY_SERVICE_UUID,
  BLEOpcode,
  DEVICE_INFO_CHARS,
  DEVICE_INFO_SERVICE_UUID,
  OPCODE_NAMES,
} from '../utils/bleConstants';
import { formatPayload } from '../utils/payloadFormatter';

// Map UUIDs to readable names
const KNOWN_UUID_NAMES: Record<string, string> = {
  [BATTERY_LEVEL_CHAR_UUID]: 'Battery Level (Standard)',
  [BATTERY_PROPRIETARY_CHAR_UUID]: 'Battery Data (Proprietary)',
  [BATTERY_SERVICE_UUID]: 'Battery Service',
  [DEVICE_INFO_SERVICE_UUID]: 'Device Info Service',
  ...Object.entries(DEVICE_INFO_CHARS).reduce(
    (acc, [name, uuid]) => ({ ...acc, [uuid]: name }),
    {}
  ),
};

interface DebugPacket {
  id: number;
  timestamp: Date;
  direction?: 'TX' | 'RX';
  opcode?: number;
  payload?: string;
  raw: string;
  type: 'packet' | 'system' | 'error';
  uuid?: string;
}

export const DebugView = () => {
  const { debugLogs, clearDebugLogs } = useBLELogs();
  const listRef = useRef<HTMLUListElement>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    console.log(`[DebugView] Rendered with ${debugLogs.length} logs`);
  }, [debugLogs.length]);

  const handleClear = () => {
    // Clear debug logs in context
    clearDebugLogs();
  };

  const handleCopyJson = () => {
    const exportData = debugLogs.map((log: DebugPacket) => ({
      timestamp: log.timestamp.toISOString(),
      type: log.type,
      direction: log.direction,
      opcode:
        log.opcode !== undefined
          ? `0x${log.opcode.toString(16).toUpperCase().padStart(2, '0')}`
          : undefined,
      opcodeName: log.opcode !== undefined ? getOpcodeName(log.opcode) : undefined,
      payload: log.payload,
      raw: log.raw,
    }));
    const json = JSON.stringify(exportData);
    navigator.clipboard.writeText(json);
    setCopySuccess(true);
  };

  const getOpcodeName = (opcode: number) => {
    if (opcode === 0) return 'UNPARSABLE / RAW';
    if (opcode === BLEOpcode.INTERNAL_GATT_OPERATION) return 'GATT READ';
    return (
      OPCODE_NAMES[opcode] || `UNKNOWN (0x${opcode.toString(16).toUpperCase().padStart(2, '0')})`
    );
  };

  const renderPayload = (packet: DebugPacket) => {
    if (packet.opcode === BLEOpcode.INTERNAL_GATT_OPERATION) {
      // Special handling for GATT logs
      const uuid = packet.uuid;
      const knownName = uuid
        ? Object.entries(KNOWN_UUID_NAMES).find(
            ([u]) =>
              u.toLowerCase().includes(uuid.toLowerCase()) ||
              uuid.toLowerCase().includes(u.toLowerCase())
          )?.[1]
        : null;

      if (packet.direction === 'TX') {
        return `READ: ${knownName || uuid || 'Unknown'}`;
      }

      // For RX, try to parse based on UUID
      if (uuid && typeof packet.payload === 'string') {
        const hex = packet.payload.replace(/ /g, '');
        const lowerUuid = uuid.toLowerCase();

        // Standard Battery Level
        if (
          lowerUuid.includes(BATTERY_LEVEL_CHAR_UUID.toLowerCase()) ||
          BATTERY_LEVEL_CHAR_UUID.toLowerCase().includes(lowerUuid)
        ) {
          const level = parseInt(hex, 16);
          return `${level}% (${knownName || 'Battery'})`;
        }

        // Device Info Characteristics (Strings)
        const isDeviceInfo = Object.values(DEVICE_INFO_CHARS).some(
          (u) => lowerUuid.includes(u.toLowerCase()) || u.toLowerCase().includes(lowerUuid)
        );

        if (isDeviceInfo) {
          try {
            let str = '';
            for (let i = 0; i < hex.length; i += 2) {
              const code = parseInt(hex.substr(i, 2), 16);
              if (code !== 0) str += String.fromCharCode(code); // skip null bytes
            }
            return `"${str}" (${knownName})`;
          } catch {
            /* fallback */
          }
        }
      }

      return `${packet.payload} ${knownName ? `(${knownName})` : ''}`;
    }

    return formatPayload(packet.opcode!, packet.payload);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          p: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Typography variant="h6">BLE Activity Logger</Typography>
        <Box>
          <Tooltip title="Copier JSON">
            <IconButton onClick={handleCopyJson}>
              <ContentCopyIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Effacer">
            <IconButton onClick={handleClear}>
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      <List sx={{ flexGrow: 1, overflow: 'auto', p: 0 }} ref={listRef}>
        {debugLogs.length === 0 && (
          <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
            No activity captured yet
          </Box>
        )}
        {debugLogs.map((packet: DebugPacket) => (
          <div key={packet.id}>
            <ListItem alignItems="flex-start" sx={{ py: 1 }}>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label={
                        packet.type === 'packet' ? packet.direction : packet.type.toUpperCase()
                      }
                      size="small"
                      color={
                        packet.type === 'error'
                          ? 'error'
                          : packet.type === 'system'
                            ? 'info'
                            : packet.direction === 'TX'
                              ? 'primary'
                              : 'secondary'
                      }
                      variant={packet.type === 'packet' ? 'outlined' : 'filled'}
                    />
                    <Typography
                      variant="subtitle2"
                      component="span"
                      sx={{ fontFamily: 'monospace' }}
                    >
                      {packet.timestamp.toLocaleTimeString()}.
                      {packet.timestamp.getMilliseconds().toString().padStart(3, '0')}
                    </Typography>
                    {packet.type === 'packet' && (
                      <Typography variant="subtitle2" component="span" sx={{ fontWeight: 'bold' }}>
                        {getOpcodeName(packet.opcode!)}
                      </Typography>
                    )}
                  </Box>
                }
                secondary={
                  <Box
                    sx={{
                      mt: 0.5,
                      fontFamily: 'monospace',
                      fontSize: '0.85rem',
                      wordBreak: 'break-all',
                    }}
                  >
                    {packet.type === 'packet' ? (
                      <>
                        {packet.opcode !== BLEOpcode.INTERNAL_GATT_OPERATION && (
                          <Typography variant="caption" display="block" color="text.secondary">
                            Opcode: 0x{packet.opcode!.toString(16).padStart(2, '0').toUpperCase()}
                          </Typography>
                        )}
                        <Typography variant="caption" display="block" color="text.secondary">
                          Payload: {renderPayload(packet)}
                        </Typography>
                        <Typography
                          variant="caption"
                          display="block"
                          color="text.secondary"
                          sx={{ mt: 1 }}
                        >
                          Raw: {packet.raw || '(empty)'}
                        </Typography>
                      </>
                    ) : (
                      <Typography variant="body2" color="text.primary">
                        {packet.raw}
                      </Typography>
                    )}
                  </Box>
                }
                slotProps={{
                  primary: { component: 'div' },
                  secondary: { component: 'div' },
                }}
              />
            </ListItem>
            <Divider component="li" />
          </div>
        ))}
      </List>
      <Snackbar
        open={copySuccess}
        autoHideDuration={3000}
        onClose={() => setCopySuccess(false)}
        message="Logs copiés au format JSON"
      />
    </Box>
  );
};
