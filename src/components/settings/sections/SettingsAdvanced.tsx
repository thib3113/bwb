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
import { ExpandMore, FileDownload, FileUpload, BugReport, Delete } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { packetLogger } from '../../../services/PacketLoggerService';

interface SettingsAdvancedProps {
  onExport: () => void;
  onImport: () => void;
}

export const SettingsAdvanced: React.FC<SettingsAdvancedProps> = ({ onExport, onImport }) => {
  const { t } = useTranslation(['settings', 'common']);

  const handleExportLogs = async () => {
    try {
      const logs = await packetLogger.exportLogs();
      const blob = new Blob([logs], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `boks_packet_logs_${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to export logs', e);
      alert('Failed to export logs');
    }
  };

  const handleClearLogs = async () => {
    if (confirm(t('common:confirm_delete') || 'Êtes-vous sûr ?')) {
      await packetLogger.clearLogs();
      alert('Logs effacés');
    }
  };

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

            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2" color="text.secondary">
              Debug / Logs BLE (Paquets)
            </Typography>

            <Button
              variant="outlined"
              color="warning"
              startIcon={<BugReport />}
              onClick={handleExportLogs}
              fullWidth
            >
              Exporter les logs paquets (JSON)
            </Button>

            <Button
              variant="outlined"
              color="error"
              startIcon={<Delete />}
              onClick={handleClearLogs}
              fullWidth
            >
              Effacer les logs paquets
            </Button>
          </Box>
        </AccordionDetails>
      </Accordion>
    </>
  );
};
