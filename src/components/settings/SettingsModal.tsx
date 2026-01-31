import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { SettingsContent } from './SettingsContent';
import { SettingsConfig } from './types';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (config: SettingsConfig) => void;
}

export const SettingsModal = ({ open, onClose, onSave }: SettingsModalProps) => {
  const { t } = useTranslation(['settings', 'common']);

  const handleSave = (config: SettingsConfig) => {
    onSave(config);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('settings:title')}</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          <SettingsContent onSave={handleSave} onCancel={onClose} isModal={true} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('cancel')}</Button>
        <Button
          onClick={() => {
            // We'll let SettingsContent handle the save
          }}
          variant="contained"
        >
          {t('save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
