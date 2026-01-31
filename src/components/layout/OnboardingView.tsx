import { Box, Button, CircularProgress, Typography, useTheme } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useBLEConnection } from '../../hooks/useBLEConnection';
import { useState } from 'react';
import { translateBLEError } from '../../utils/bleUtils';

interface OnboardingViewProps {
  showNotification: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const OnboardingView = ({ showNotification }: OnboardingViewProps) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { connect, isConnecting } = useBLEConnection();
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const handleConnectClick = async () => {
    setConnectionError(null);
    try {
      await connect();
      showNotification(t('ble.connected'), 'success');
    } catch (error: unknown) {
      const errorKey = translateBLEError(error);
      const finalMessage = errorKey.startsWith('errors.') ? t(errorKey) : errorKey;
      setConnectionError(finalMessage);
      showNotification(`${t('ble.connection_failed')}: ${finalMessage}`, 'error');
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        p: 3,
        textAlign: 'center',
      }}
    >
      <Typography variant="h4" component="h1" gutterBottom>
        {t('app_title')}
      </Typography>

      <Typography variant="h6" sx={{ mb: 4, color: theme.palette.text.secondary }}>
        {t('not_connected.message')}
      </Typography>

      <Button
        variant="contained"
        size="large"
        onClick={handleConnectClick}
        disabled={isConnecting}
        sx={{
          py: 1.5,
          px: 4,
          fontSize: '1.1rem',
          mb: 2,
        }}
      >
        {isConnecting ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={24} sx={{ color: 'white' }} />
            {t('connecting')}
          </Box>
        ) : (
          t('connection.connect')
        )}
      </Button>

      {connectionError && (
        <Typography variant="body2" color="error" sx={{ mt: 2 }}>
          {connectionError}
        </Typography>
      )}
    </Box>
  );
};
