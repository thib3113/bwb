import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import BluetoothIcon from '@mui/icons-material/Bluetooth';
import ScienceIcon from '@mui/icons-material/Science';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useBLEConnection } from '../../hooks/useBLEConnection';
import {
  DEBUG_WIZARD_DISCONNECT_DELAY_MS,
  DEBUG_WIZARD_CONNECT_DELAY_MS,
} from '../../utils/bleConstants';
import { DebugWizardState } from '../../context/types';

interface CustomResult {
  serviceUuid: string;
  charUuid: string;
  value: string;
  timestamp: string;
}

interface DebugWizardStep4AdvancedProps {
  customUuids: string[];
  customResults: CustomResult[];
  updateDebugWizardState: (updates: Partial<DebugWizardState>) => void;
}

export const DebugWizardStep4Advanced: React.FC<DebugWizardStep4AdvancedProps> = ({
  customUuids,
  customResults,
  updateDebugWizardState,
}) => {
  const { t } = useTranslation(['wizard', 'common', 'codes']);
  const { connect, disconnect, device } = useBLEConnection();

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customUuidInput, setCustomUuidInput] = useState('');
  const [isDiscoveringCustom, setIsDiscoveringCustom] = useState(false);

  const handleAddCustomUuid = () => {
    if (!customUuidInput) return;
    const cleanUuid = customUuidInput.trim().toLowerCase();
    if (customUuids.includes(cleanUuid)) return;

    updateDebugWizardState({
      customUuids: [...customUuids, cleanUuid],
    });
    setCustomUuidInput('');
  };

  const handleRemoveCustomUuid = (uuid: string) => {
    updateDebugWizardState({
      customUuids: customUuids.filter((u) => u !== uuid),
    });
  };

  const handleDiscoverCustom = async () => {
    if (customUuids.length === 0) return;

    setIsDiscoveringCustom(true);
    try {
      // 1. Disconnect current session
      console.log('DebugWizard: Disconnecting for custom discovery...');
      disconnect();

      // 2. Wait for disconnection to propagate
      await new Promise((resolve) => setTimeout(resolve, DEBUG_WIZARD_DISCONNECT_DELAY_MS));

      // 3. Connect with custom services
      console.log('DebugWizard: Reconnecting with custom services:', customUuids);
      await connect(customUuids);

      // 4. Wait for connection and GATT to be ready
      await new Promise((resolve) => setTimeout(resolve, DEBUG_WIZARD_CONNECT_DELAY_MS));

      const results: CustomResult[] = [];
      // Note: device might be stale here if connect replaced it, but we can't call hooks here.
      // We rely on the device object reference or the fact that we just connected.
      const currentDevice = device;

      if (!currentDevice?.gatt?.connected) {
        // If context doesn't have it yet, we might need to wait or rely on the instance
        console.warn('Device not marked as connected yet, checking GATT directly...');
      }

      for (const sUuid of customUuids) {
        try {
          console.log(`DebugWizard: Accessing service ${sUuid}`);
          // Note: In Web BLE we might need to get the server from the device
          const server = currentDevice?.gatt;
          if (!server) continue;

          const service = await server.getPrimaryService(sUuid);
          const characteristics = await service.getCharacteristics();

          for (const char of characteristics) {
            try {
              console.log(`DebugWizard: Reading characteristic ${char.uuid}`);
              const val = await char.readValue();
              const bytes = new Uint8Array(val.buffer);
              const hex = Array.from(bytes)
                .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
                .join(' ');

              results.push({
                serviceUuid: sUuid,
                charUuid: char.uuid,
                value: hex,
                timestamp: new Date().toISOString(),
              });
            } catch (e) {
              console.warn(`Failed to read char ${char.uuid} in service ${sUuid}`, e);
            }
          }
        } catch (e) {
          console.warn(`Failed to access service ${sUuid}`, e);
        }
      }

      updateDebugWizardState({ customResults: results });
    } catch (e: unknown) {
      console.error('Custom discovery failed:', e);
    } finally {
      setIsDiscoveringCustom(false);
    }
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        {t('advanced.title')}
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        {t('advanced.warning')}
      </Alert>

      <Stack spacing={3}>
        {/* Tutorial Section (now at the top and collapsible) */}
        <Card variant="outlined">
          <CardContent>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
              }}
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <Stack direction="row" alignItems="center" spacing={1}>
                <ScienceIcon color="primary" />
                <Typography variant="h6">{t('advanced.tutorial_title')}</Typography>
              </Stack>
              <IconButton>{showAdvanced ? <ExpandLessIcon /> : <ExpandMoreIcon />}</IconButton>
            </Box>

            <Collapse in={showAdvanced}>
              <Box sx={{ mt: 3 }}>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  {t('advanced.tutorial_desc')}
                </Typography>

                <Stack direction="row" spacing={2} sx={{ mt: 2, justifyContent: 'center' }}>
                  <Button
                    variant="outlined"
                    href="https://play.google.com/store/apps/details?id=no.nordicsemi.android.mcp"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Android (Play Store)
                  </Button>
                  <Button
                    variant="outlined"
                    href="https://apps.apple.com/us/app/nrf-connect-for-mobile/id1054362403"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    iOS (App Store)
                  </Button>
                </Stack>
              </Box>
            </Collapse>
          </CardContent>
        </Card>

        {/* Manual Service Explorer Section */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" gutterBottom fontWeight="bold">
              {t('advanced.explorer_title')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t('advanced.explorer_desc')}
            </Typography>

            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                size="small"
                fullWidth
                placeholder="ex: 0000180f-0000-1000-8000-00805f9b34fb"
                value={customUuidInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setCustomUuidInput(e.currentTarget.value)
                }
                onKeyPress={(e: React.KeyboardEvent<HTMLDivElement>) =>
                  e.key === 'Enter' && handleAddCustomUuid()
                }
              />
              <Button variant="outlined" onClick={handleAddCustomUuid}>
                {t('codes:add_new')}
              </Button>
            </Box>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
              {customUuids.map((uuid) => (
                <Chip
                  key={uuid}
                  label={uuid}
                  onDelete={() => handleRemoveCustomUuid(uuid)}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              ))}
            </Box>

            <Button
              variant="contained"
              fullWidth
              disabled={customUuids.length === 0 || isDiscoveringCustom}
              onClick={handleDiscoverCustom}
              startIcon={
                isDiscoveringCustom ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <BluetoothIcon />
                )
              }
            >
              {isDiscoveringCustom ? t('advanced.exploring') : t('advanced.explore_button')}
            </Button>

            {customResults.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Résultats trouvés : {customResults.length}
                </Typography>
                <List dense>
                  {customResults.map((res, i) => (
                    <ListItem key={i} divider>
                      <ListItemText
                        primary={`Char: ${res.charUuid.substring(0, 8)}...`}
                        secondary={`Service: ${res.serviceUuid.substring(0, 8)}... | Val: ${res.value}`}
                        secondaryTypographyProps={{
                          sx: { fontFamily: 'monospace', fontSize: '0.75rem' },
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
};
