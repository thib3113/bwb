import { Box, Paper, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useDevice } from '../../hooks/useDevice';
import { compareVersions } from '../../utils/version';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

const MIN_SOFTWARE_REVISION = '4.1.14';

export const VersionGuard = () => {
  const { t } = useTranslation();
  const { activeDevice } = useDevice();

  if (!activeDevice) return null;

  // Check Software Version
  const isOldSoftware =
    activeDevice.software_revision &&
    compareVersions(activeDevice.software_revision, MIN_SOFTWARE_REVISION) < 0;

  // Check Hardware Version (Must be mapped if firmware is present)
  // Logic: If we have a firmware revision (meaning we read it), we MUST have a mapped hardware version.
  const isUnknownHardware =
    activeDevice.firmware_revision && !activeDevice.hardware_version;

  if (!isOldSoftware && !isUnknownHardware) return null;

  const title = isOldSoftware
    ? t('common:errors.version.update_required_title')
    : t('common:errors.version.unknown_hardware_title');

  const message = isOldSoftware
    ? t('common:errors.version.update_required_message')
    : t('common:errors.version.unknown_hardware_message');

  return (
    <Box
      data-testid="version-guard-overlay"
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        bgcolor: 'rgba(0, 0, 0, 0.8)',
        zIndex: 9999, // Extremely high z-index to block everything
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3
      }}
    >
      <Paper
        elevation={6}
        sx={{
          p: 4,
          maxWidth: 400,
          textAlign: 'center',
          borderRadius: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2
        }}
      >
        <ErrorOutlineIcon color="error" sx={{ fontSize: 64 }} />
        <Typography variant="h5" component="h2" color="error" fontWeight="bold">
          {title}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {message}
        </Typography>
      </Paper>
    </Box>
  );
};
