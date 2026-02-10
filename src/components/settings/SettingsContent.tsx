import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, Snackbar } from '@mui/material';
import { useSettings } from '../../hooks/useSettings';
import { useTheme } from '../../hooks/useTheme';
import i18n from '../../i18n';
import { useTranslation } from 'react-i18next';
import { StorageService } from '../../services/StorageService';
import { db } from '../../db/db';
import { BoksCode, CODE_TYPE, ExportData, UserRole } from '../../types';
import { SettingsConfig } from './types';
import {
  APP_EVENTS,
  IMPORT_EXPORT_MODES,
  LANGUAGES,
  SNACKBAR_SEVERITY,
  THEME_MODES
} from '../../utils/constants';

import { SettingsGeneral } from './sections/SettingsGeneral';
import { SettingsAdvanced } from './sections/SettingsAdvanced';
import { ImportExportDialog } from './sections/ImportExportDialog';
import { SettingsCommunity } from './sections/SettingsCommunity';

interface SettingsContentProps {
  onSave?: (config: SettingsConfig) => void;
  onCancel?: () => void;
  isModal?: boolean;
}

export const SettingsContent = ({ onSave, onCancel, isModal = false }: SettingsContentProps) => {
  const { settings, updateSetting } = useSettings();
  const { mode: themeMode, setThemeMode } = useTheme();
  const { t } = useTranslation(['common', 'settings']);

  // Draft state for settings
  const [draftConfig, setDraftConfig] = useState<SettingsConfig>({
    language: LANGUAGES.EN,
    theme: THEME_MODES.SYSTEM,
    autoImport: false
  });

  // State for import/export functionality
  const [importExportDialogOpen, setImportExportDialogOpen] = useState(false);
  const [importExportMode, setImportExportMode] = useState<string>(IMPORT_EXPORT_MODES.EXPORT);
  const [importExportContent, setImportExportContent] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<
    'success' | 'error' | 'info' | 'warning'
  >('info');

  // Initialize draft config
  useEffect(() => {
    setDraftConfig({
      language: i18n.resolvedLanguage || i18n.language || LANGUAGES.EN,
      theme: themeMode || THEME_MODES.SYSTEM,
      autoImport: settings.autoImport ?? true
    });
  }, [settings, themeMode]);

  const handleThemeChange = (value: string) => {
    setDraftConfig((prev) => ({
      ...prev,
      theme: value
    }));
  };

  const handleLanguageChange = (value: string) => {
    setDraftConfig((prev) => ({
      ...prev,
      language: value
    }));
  };

  const handleAutoImportChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.currentTarget.checked;
    setDraftConfig((prev) => ({
      ...prev,
      autoImport: value
    }));
    // Instant update for this specific setting
    updateSetting('autoImport', value);
  };

  const handleSave = useCallback(() => {
    // Apply language changes
    i18n.changeLanguage(draftConfig.language);

    // Apply theme changes
    setThemeMode(draftConfig.theme);

    // Update settings
    updateSetting('autoImport', draftConfig.autoImport);

    if (onSave) {
      onSave(draftConfig);
    }
  }, [draftConfig, setThemeMode, updateSetting, onSave]);

  // Listen for mobile save event
  useEffect(() => {
    const handleMobileSave = () => {
      handleSave();
    };

    globalThis.window.addEventListener(APP_EVENTS.MOBILE_SETTINGS_SAVE, handleMobileSave);

    return () => {
      globalThis.window.removeEventListener(APP_EVENTS.MOBILE_SETTINGS_SAVE, handleMobileSave);
    };
  }, [handleSave]);

  // Function to handle export
  const handleExport = async () => {
    try {
      // Get all devices
      const devices = await db.devices.toArray();

      // Prepare export data structure
      const exportData: ExportData = {
        settings: {
          autoImport: settings.autoImport || false,
          language: i18n.resolvedLanguage || i18n.language || LANGUAGES.EN,
          theme: themeMode || THEME_MODES.SYSTEM
        },
        devices: [],
        codes: []
      };

      // Add device data and codes for each device
      for (const device of devices) {
        // Get secrets for this device
        const secrets = await db.device_secrets.get(device.id);

        // Get codes for this device
        const codes = await StorageService.loadCodes(device.id);

        // Filter valid codes (permanent or with remaining uses)
        const validCodes = codes.filter((code) => {
          if (code.type === CODE_TYPE.MASTER) return true;
          if (code.type === CODE_TYPE.MULTI) {
            return !code.uses || code.uses < (code.maxUses || Infinity);
          }
          if (code.type === CODE_TYPE.SINGLE) {
            return !code.usedAt && (!code.expiresAt || new Date(code.expiresAt) > new Date());
          }
          return false;
        });

        exportData.devices.push({
          id: device.id,
          name: device.friendly_name,
          configuration_key: secrets?.configuration_key,
          door_pin_code: device.door_pin_code
        });

        exportData.codes.push(
          ...validCodes.map((code) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { id, device_id, ...codeWithoutIds } = code;
            return {
              deviceId: device.id,
              ...codeWithoutIds
            };
          })
        );
      }

      // Set the export content and open dialog
      setImportExportContent(JSON.stringify(exportData, null, 2));
      setImportExportMode(IMPORT_EXPORT_MODES.EXPORT);
      setImportExportDialogOpen(true);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Export failed:', error);
      setSnackbarMessage(t('settings:export_failed') + ': ' + errorMessage);
      setSnackbarSeverity(SNACKBAR_SEVERITY.ERROR);
      setSnackbarOpen(true);
    }
  };

  // Function to handle import
  const handleImport = async () => {
    try {
      // Parse the import content
      let importData;
      try {
        importData = JSON.parse(importExportContent);
      } catch {
        throw new Error(t('settings:invalid_json'));
      }

      // Validate structure
      if (!importData.settings || !importData.devices || !importData.codes) {
        throw new Error(t('settings:invalid_structure'));
      }

      // Import settings
      if (importData.settings) {
        const { autoImport, language, theme } = importData.settings;

        // Update global settings
        if (autoImport !== undefined) {
          updateSetting('autoImport', autoImport);
        }

        // Update language if different
        if (language && language !== i18n.language) {
          i18n.changeLanguage(language);
        }

        // Update theme if different
        if (theme && theme !== themeMode) {
          setThemeMode(theme);
        }
      }

      // Import devices and codes
      for (const device of importData.devices) {
        // Check if device already exists using UUID primary key
        const existingDevice = await db.devices.get(device.id);

        if (!existingDevice) {
          // Add new device
          await db.devices.add({
            id: device.id,
            ble_name: device.ble_name || device.id,
            friendly_name: device.name || `Imported Boks ${device.id.substring(0, 8)}`,
            last_connected_at: Date.now(),
            role: UserRole.Reader, // Default role for imported device if not specified
            sync_status: 'synced'
          });

          // Restore secrets if available
          if (device.configuration_key) {
            await db.device_secrets.add({
              device_id: device.id,
              configuration_key: device.configuration_key
            });
          }

          // Restore door pin code if available
          if (device.door_pin_code) {
            await db.devices.update(device.id, {
              door_pin_code: device.door_pin_code
            });
          }
        }
      }

      // Import codes for each device
      for (const code of importData.codes) {
        if (code.deviceId) {
          // Check if code already exists using UUID primary key
          const existingCode = await db.codes.get(code.id);

          if (!existingCode) {
            // Add new code
            await db.codes.add({
              ...code,
              id: code.id,
              device_id: code.deviceId,
              status: code.status || 'synced',
              created_at: code.createdAt || new Date().toISOString(),
              sync_status: 'synced'
            } as BoksCode);
          }
        }
      }

      // Show success message
      setSnackbarMessage(t('settings:import_success'));
      setSnackbarSeverity(SNACKBAR_SEVERITY.SUCCESS);
      setSnackbarOpen(true);

      // Close dialog
      setImportExportDialogOpen(false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Import failed:', error);
      setSnackbarMessage(errorMessage || t('settings:import_failed'));
      setSnackbarSeverity(SNACKBAR_SEVERITY.ERROR);
      setSnackbarOpen(true);
    }
  };

  // Function to handle dialog close
  const handleDialogClose = () => {
    setImportExportDialogOpen(false);
    setImportExportContent('');
  };

  // Function to handle snackbar close
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  return (
    <Box sx={{ pt: isModal ? 1 : 0 }}>
      <SettingsGeneral
        language={draftConfig.language}
        theme={draftConfig.theme}
        autoImport={draftConfig.autoImport ?? true}
        onLanguageChange={handleLanguageChange}
        onThemeChange={handleThemeChange}
        onAutoImportChange={handleAutoImportChange}
      />

      <SettingsCommunity />

      <SettingsAdvanced
        onExport={handleExport}
        onImport={() => {
          setImportExportMode(IMPORT_EXPORT_MODES.IMPORT);
          setImportExportDialogOpen(true);
        }}
      />

      {isModal && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
          <Button onClick={onCancel}>{t('cancel')}</Button>
          <Button onClick={handleSave} variant="contained">
            {t('save')}
          </Button>
        </Box>
      )}

      <ImportExportDialog
        open={importExportDialogOpen}
        mode={importExportMode}
        content={importExportContent}
        onClose={handleDialogClose}
        onContentChange={setImportExportContent}
        onImport={handleImport}
        onCopySuccess={() => {}}
      />

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};
