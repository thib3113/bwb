import { useState, useEffect } from 'react';
import { Box, Button, Card, CardContent, Typography, Alert, Divider } from '@mui/material';
import { useTranslation } from 'react-i18next';
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import RefreshIcon from '@mui/icons-material/Refresh';

export const ServiceWorkerDebugger = () => {
  const { t } = useTranslation(['settings']);
  const [registrations, setRegistrations] = useState<ServiceWorkerRegistration[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const fetchRegistrations = async () => {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      setRegistrations([...regs]);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const handleUpdate = async (reg: ServiceWorkerRegistration) => {
    try {
      await reg.update();
      setMessage(t('settings:developer.sw_update_requested'));
      fetchRegistrations();
    } catch (e) {
      setMessage(t('settings:developer.sw_update_failed', { error: String(e) }));
    }
  };

  const handleUnregister = async (reg: ServiceWorkerRegistration) => {
    try {
      const result = await reg.unregister();
      setMessage(
        result
          ? t('settings:developer.sw_unregister_success')
          : t('settings:developer.sw_unregister_failed')
      );
      fetchRegistrations();
    } catch (e) {
      setMessage(t('settings:developer.sw_unregister_error', { error: String(e) }));
    }
  };

  const handleReload = () => {
    window.location.reload();
  };

  if (!('serviceWorker' in navigator)) {
    return <Alert severity="warning">{t('settings:developer.sw_not_supported')}</Alert>;
  }

  return (
    <Card sx={{ mt: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {t('settings:developer.sw_title')}
        </Typography>
        <Divider sx={{ mb: 2 }} />

        {message && (
          <Alert severity="info" sx={{ mb: 2 }} onClose={() => setMessage(null)}>
            {message}
          </Alert>
        )}

        {registrations.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {t('settings:developer.sw_no_active')}
          </Typography>
        ) : (
          registrations.map((reg, index) => (
            <Box key={index} sx={{ mb: 2, p: 1, border: '1px solid #ddd', borderRadius: 1 }}>
              <Typography variant="subtitle2">
                {t('settings:developer.sw_scope', { scope: reg.scope })}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {t('settings:developer.sw_status', {
                  status: reg.installing
                    ? t('settings:developer.sw_installing')
                    : reg.waiting
                      ? t('settings:developer.sw_waiting')
                      : reg.active
                        ? t('settings:developer.sw_active')
                        : t('settings:developer.sw_unknown'),
                })}
              </Typography>

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<SystemUpdateAltIcon />}
                  onClick={() => handleUpdate(reg)}
                >
                  {t('settings:developer.sw_check_update')}
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteForeverIcon />}
                  onClick={() => handleUnregister(reg)}
                >
                  {t('settings:developer.sw_unregister')}
                </Button>
              </Box>
            </Box>
          ))
        )}

        <Box sx={{ mt: 2 }}>
          <Button
            fullWidth
            variant="contained"
            color="primary"
            startIcon={<RefreshIcon />}
            onClick={handleReload}
          >
            {t('settings:developer.sw_reload')}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};
