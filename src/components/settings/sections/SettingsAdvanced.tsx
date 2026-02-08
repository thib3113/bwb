import React from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Divider,
  Typography
} from '@mui/material';
import { ExpandMore, FileDownload, FileUpload } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

interface SettingsAdvancedProps {
  onExport: () => void;
  onImport: () => void;
}

export const SettingsAdvanced: React.FC<SettingsAdvancedProps> = ({ onExport, onImport }) => {
  const { t } = useTranslation(['settings']);

  return (
    <>
      <Divider sx={{ my: 3 }} />
      <Accordion defaultExpanded={false}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="subtitle1">{t('settings:advanced_title')}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Button variant="outlined" startIcon={<FileDownload />} onClick={onExport} fullWidth>
              {t('settings:export_config')}
            </Button>

            <Button variant="outlined" startIcon={<FileUpload />} onClick={onImport} fullWidth>
              {t('settings:import_config')}
            </Button>
          </Box>
        </AccordionDetails>
      </Accordion>
    </>
  );
};
