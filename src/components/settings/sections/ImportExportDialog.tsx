import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Tooltip
} from '@mui/material';
import { ContentCopy } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { IMPORT_EXPORT_MODES } from '../../../utils/constants';

interface ImportExportDialogProps {
  open: boolean;
  mode: string;
  content: string;
  onClose: () => void;
  onContentChange: (value: string) => void;
  onImport: () => void;
  onCopySuccess: () => void;
}

export const ImportExportDialog: React.FC<ImportExportDialogProps> = ({
  open,
  mode,
  content,
  onClose,
  onContentChange,
  onImport,
  onCopySuccess
}) => {
  const { t } = useTranslation(['settings', 'common']);

  const [copySuccess, setCopySuccess] = useState(false);

  const handleCopy = () => {
    navigator.clipboard
      .writeText(content)
      .then(() => {
        setCopySuccess(true);
        onCopySuccess();
        setTimeout(() => setCopySuccess(false), 2000);
      })
      .catch((err) => {
        console.error('Failed to copy:', err);
      });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {mode === IMPORT_EXPORT_MODES.EXPORT
          ? t('settings:export_config')
          : t('settings:import_config')}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ position: 'relative' }}>
          <TextField
            multiline
            fullWidth
            minRows={10}
            maxRows={20}
            value={content}
            onChange={(e) => onContentChange(e.currentTarget.value)}
            variant="outlined"
            margin="normal"
            helperText={
              mode === IMPORT_EXPORT_MODES.EXPORT
                ? t('settings:export_instructions')
                : t('settings:import_instructions')
            }
            slotProps={{
              input: {
                readOnly: mode === IMPORT_EXPORT_MODES.EXPORT
              }
            }}
          />
          {mode === IMPORT_EXPORT_MODES.EXPORT && (
            <Tooltip title={copySuccess ? t('copied') : t('settings:copy_to_clipboard')} arrow>
              <IconButton
                onClick={handleCopy}
                sx={{
                  position: 'absolute',
                  right: 8,
                  top: 8,
                  zIndex: 1
                }}
              >
                <ContentCopy />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary">
          {t('cancel')}
        </Button>
        {mode === IMPORT_EXPORT_MODES.IMPORT && (
          <Button onClick={onImport} color="primary" variant="contained">
            {t('settings:import_button')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
