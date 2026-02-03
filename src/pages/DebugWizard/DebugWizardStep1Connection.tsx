import React from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import BluetoothIcon from '@mui/icons-material/Bluetooth';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import { BluetoothDevice } from '../../types';

interface DebugWizardStep1ConnectionProps {
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
  error: string | null;
  device: BluetoothDevice | null;
  firmwareVersion: string | null;
  isLoadingInfo: boolean;
  onRetryFetch: () => void;
}

export const DebugWizardStep1Connection: React.FC<DebugWizardStep1ConnectionProps> = ({
  isConnected,
  isConnecting,
  connect,
  error,
  device,
  firmwareVersion,
  isLoadingInfo,
  onRetryFetch,
}) => {
  const { t } = useTranslation(['wizard', 'common']);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tAny = t as any;

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        {tAny('connect.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {tAny('connect.desc')}
      </Typography>

      {!isConnected ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 4 }}>
          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {error.startsWith('errors.') ? tAny(`common:${error}`) : error}
            </Alert>
          )}
          <Button
            variant="contained"
            size="large"
            startIcon={
              isConnecting ? <CircularProgress size={20} color="inherit" /> : <BluetoothIcon />
            }
            onClick={() => connect()}
            disabled={isConnecting}
          >
            {isConnecting ? tAny('common:connecting') : tAny('connect.button')}
          </Button>
        </Box>
      ) : (
        <Card variant="outlined" sx={{ mt: 2, borderColor: 'success.main' }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
              <CheckCircleIcon color="success" fontSize="large" />
              <Box>
                <Typography variant="h6" color="success.main">
                  {tAny('connect.success')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {tAny('connect.ready')}
                </Typography>
              </Box>
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" gutterBottom>
              Informations de l'appareil :
            </Typography>

            <Stack spacing={1}>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Nom :
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {device?.name || 'Inconnu'}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  ID :
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {device?.id || 'Inconnu'}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  Firmware :
                </Typography>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body2" fontWeight="medium">
                    {isLoadingInfo ? <CircularProgress size={12} /> : firmwareVersion || 'Inconnu'}
                  </Typography>
                  {!isLoadingInfo && (
                    <Button size="small" onClick={onRetryFetch} sx={{ minWidth: 0, p: 0.5 }}>
                      <RefreshIcon sx={{ fontSize: 16 }} />
                    </Button>
                  )}
                </Box>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};
