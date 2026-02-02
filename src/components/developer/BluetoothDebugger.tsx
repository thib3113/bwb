import { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Paper,
  Alert,
} from '@mui/material';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { PacketFactory } from '../../ble/packets/PacketFactory';
import { useBLE } from '../../hooks/useBLE';
import { BoksTXPacket } from '../../ble/packets/BoksTXPacket';
import { BLEOpcode } from '../../utils/bleConstants';
import { PacketLogger } from './PacketLogger';

// Helper to get friendly names for opcodes
const getOpcodeName = (opcode: number): string => {
  return BLEOpcode[opcode] || `UNKNOWN_OPCODE_${opcode}`;
};

// Global in-memory storage for field values across component re-renders
// Key: field name (e.g., 'pinCode', 'configKey'), Value: last entered value
const fieldMemory: Record<string, string> = {};

export const BluetoothDebugger = () => {
  const { t } = useTranslation(['settings']);
  const { sendPacket, isConnected } = useBLE();
  const [selectedOpcode, setSelectedOpcode] = useState<number | ''>('');
  // Store form values as a simple Record
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Get list of registered TX packets
  const registeredPackets = useMemo(() => {
    return Array.from(PacketFactory.getRegisteredTXPackets().entries()).sort((a, b) => a[0] - b[0]);
  }, []);

  // Get current selected packet class
  const SelectedPacketClass = useMemo(() => {
    if (selectedOpcode === '') return null;
    const Class = PacketFactory.getRegisteredTXPackets().get(selectedOpcode);
    return Class as (typeof Class & { schema?: z.ZodObject<any> }) | undefined;
  }, [selectedOpcode]);

  // Extract Zod Schema shape if available
  const schemaShape = useMemo(() => {
    if (!SelectedPacketClass || !SelectedPacketClass.schema) return null;
    // We assume it's a z.object() schema
    if (SelectedPacketClass.schema instanceof z.ZodObject) {
      return SelectedPacketClass.schema.shape;
    }
    return null;
  }, [SelectedPacketClass]);

  // When schema changes (new packet selected), pre-fill from memory
  useEffect(() => {
    if (!schemaShape) {
      setFormData({});
      return;
    }

    const newFormData: Record<string, string> = {};
    Object.keys(schemaShape).forEach((key) => {
      // Use stored value if exists, otherwise empty string
      newFormData[key] = fieldMemory[key] || '';
    });
    setFormData(newFormData);
  }, [schemaShape]);

  const handleOpcodeChange = (event: any) => {
    setSelectedOpcode(event.target.value);
    // formData reset is handled by the useEffect above
    setValidationError(null);
    setSuccessMessage(null);
  };

  const handleInputChange = (field: string, value: string) => {
    // Update local state
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Update global memory
    fieldMemory[field] = value;

    setValidationError(null);
    setSuccessMessage(null);
  };

  const handleSend = async () => {
    if (!SelectedPacketClass) return;
    setValidationError(null);
    setSuccessMessage(null);

    try {
      let packetData: any = {};

      // If we have a schema, validate and parse
      if (SelectedPacketClass.schema) {
        // Validate with Zod (using safeParse to handle errors gracefully)
        const result = SelectedPacketClass.schema.safeParse(formData);

        if (!result.success) {
          const errorMsg = result.error.errors
            .map((e) => `${e.path.join('.')}: ${e.message}`)
            .join(', ');
          setValidationError(errorMsg);
          return;
        }
        packetData = result.data;
      }

      // Instantiate the packet
      const packet = new SelectedPacketClass();

      // Populate properties.
      Object.assign(packet, packetData);

      await sendPacket(packet);
      console.log('Packet sent successfully', packet);
      setSuccessMessage(t('settings:developer.packet_sent_success'));
    } catch (e: any) {
      console.error('Failed to send packet', e);
      setValidationError(e.message || t('settings:developer.packet_send_error'));
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Alert severity={isConnected ? 'success' : 'warning'}>
        {isConnected
          ? t('settings:developer.enabled_success')
          : t('settings:developer.not_connected_warning')}
      </Alert>

      <FormControl fullWidth>
        <InputLabel>{t('settings:developer.packet_type_label')}</InputLabel>
        <Select
          value={selectedOpcode}
          label={t('settings:developer.packet_type_label')}
          onChange={handleOpcodeChange}
        >
          {registeredPackets.map(([opcode]) => (
            <MenuItem key={opcode} value={opcode}>
              {getOpcodeName(opcode)} ({opcode})
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {SelectedPacketClass && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            {t('settings:developer.packet_parameters_title')}
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {schemaShape ? (
              Object.keys(schemaShape).length > 0 ? (
                Object.keys(schemaShape).map((key) => {
                  const fieldSchema = schemaShape[key];

                  // This is a rough check for Zod types
                  let isNumber = false;
                  const typeName = fieldSchema._def.typeName;
                  // Handle optional/nullable wrappers if needed, for now stick to basics
                  if (
                    typeName === 'ZodNumber' ||
                    (typeName === 'ZodEffects' &&
                      fieldSchema._def.schema?._def.typeName === 'ZodNumber')
                  ) {
                    isNumber = true;
                  }

                  return (
                    <TextField
                      key={key}
                      label={key}
                      variant="outlined"
                      fullWidth
                      type={isNumber ? 'number' : 'text'}
                      value={formData[key] || ''}
                      onChange={(e) => handleInputChange(key, e.target.value)}
                      helperText={isNumber ? 'Number' : 'String'}
                    />
                  );
                })
              ) : (
                <Typography color="text.secondary">
                  {t('settings:developer.no_parameters')}
                </Typography>
              )
            ) : (
              <Typography color="text.secondary">{t('settings:developer.no_schema')}</Typography>
            )}

            {validationError && <Alert severity="error">{validationError}</Alert>}
            {successMessage && <Alert severity="success">{successMessage}</Alert>}

            <Button
              variant="contained"
              onClick={handleSend}
              disabled={!isConnected && !window.BOKS_SIMULATOR_ENABLED}
            >
              {t('settings:developer.send_packet')}
            </Button>
          </Box>
        </Paper>
      )}

      {/* Packet Logger Integration */}
      <PacketLogger />
    </Box>
  );
};
