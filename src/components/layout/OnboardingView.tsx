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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tAny = t as any;
  const theme = useTheme();
  const { connect, isConnecting } = useBLEConnection();
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const handleConnectClick = async () => {
    setConnectionError(null);
    try {
      await connect();
      showNotification(tAny('ble.connected'), 'success');
    } catch (error: unknown) {
      const errorKey = translateBLEError(error);
      const finalMessage = errorKey.startsWith('errors.') ? tAny(errorKey) : errorKey;
      setConnectionError(finalMessage);
      showNotification(`${tAny('ble.connection_failed')}: ${finalMessage}`, 'error');
    }
  };

  return (
    <Box data-testid="onboarding-view"
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
        {tAny('app_title')}
      </Typography>

      <Typography variant="h6" sx={{ mb: 4, color: theme.palette.text.secondary }}>
        {tAny('not_connected.message')}
      </Typography>

      <Button data-testid="connect-button"
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
          <Box data-testid="onboarding-view" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={24} sx={{ color: 'white' }} />
            {tAny('connecting')}
          </Box>
        ) : (
          tAny('connection.connect')
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
