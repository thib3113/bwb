import { Alert, AlertTitle, Box, Button } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useDevice } from '../../hooks/useDevice';
import { MIN_FIRMWARE_VERSION } from '../../utils/constants';
import { useVersionCheck } from '../../hooks/useVersionCheck';
import { useNavigate } from 'react-router-dom';

export const VersionBanner = () => {
  const { t } = useTranslation();
  const { activeDevice } = useDevice();
  const { isOldSoftware, isUnknownHardware, isRestricted } = useVersionCheck();
  const navigate = useNavigate();

  if (!activeDevice || !isRestricted) return null;

  const title = isOldSoftware
    ? t('common:errors.version.update_required_title')
    : t('common:errors.version.unknown_hardware_title');

  const message = isOldSoftware
    ? t('common:errors.version.update_required_message', {
        currentVersion: activeDevice.software_revision,
        minVersion: MIN_FIRMWARE_VERSION
      })
    : t('common:errors.version.unknown_hardware_message');

  return (
    <Box sx={{ width: '100%', p: 2, pb: 0 }}>
      <Alert
        severity="error"
        data-testid="version-guard-banner"
        action={
          isOldSoftware && (
            <Button color="inherit" size="small" onClick={() => navigate('/update')}>
              {t('common:actions.update')}
            </Button>
          )
        }
      >
        <AlertTitle data-testid="version-guard-title">{title}</AlertTitle>
        <Box data-testid="version-guard-message">{message}</Box>
      </Alert>
    </Box>
  );
};
