import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  TextField,
  Typography
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useBLE } from '../../hooks/useBLE';
import { PacketLogger } from './PacketLogger';
import { RawTXPacket } from '../../ble/packets/RawTXPacket';

export const BluetoothDebugger = () => {
  const { t } = useTranslation(['settings']);
  const { sendPacket, isConnected } = useBLE();

  const [opcodeStr, setOpcodeStr] = useState('');
  const [payloadStr, setPayloadStr] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSend = async () => {
      setError(null);
      setSuccess(null);

      try {
          const opcode = parseInt(opcodeStr, 16);
          if (isNaN(opcode)) throw new Error('Invalid Opcode');

          let payload = new Uint8Array(0);
          if (payloadStr) {
              const hex = payloadStr.replace(/[^0-9A-Fa-f]/g, '');
              if (hex.length % 2 !== 0) throw new Error('Invalid payload hex length');
              const bytes = new Uint8Array(hex.length / 2);
              for (let i = 0; i < hex.length; i += 2) {
                  bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
              }
              payload = bytes;
          }

          await sendPacket(new RawTXPacket(opcode, payload));
          setSuccess('Packet sent');
      } catch (e: any) {
          setError(e.message);
      }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Alert severity={isConnected ? 'success' : 'warning'}>
        {isConnected
          ? t('settings:developer.enabled_success')
          : t('settings:developer.not_connected_warning')}
      </Alert>

      <Typography variant="h6">Raw Packet Sender</Typography>

      <TextField
        label="Opcode (Hex)"
        value={opcodeStr}
        onChange={e => setOpcodeStr(e.target.value)}
        placeholder="e.g. 11"
      />

      <TextField
        label="Payload (Hex)"
        value={payloadStr}
        onChange={e => setPayloadStr(e.target.value)}
        placeholder="e.g. 00FF..."
      />

      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}

      <Button
        variant="contained"
        onClick={handleSend}
        disabled={!isConnected}
      >
        Send
      </Button>

      {/* Packet Logger Integration */}
      <PacketLogger />
    </Box>
  );
};
