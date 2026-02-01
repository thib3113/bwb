import { useState, useMemo } from 'react';
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
import { PacketFactory } from '../../ble/packets/PacketFactory';
import { useBLE } from '../../hooks/useBLE';
import { BoksTXPacket } from '../../ble/packets/BoksTXPacket';
import { BLEOpcode } from '../../utils/bleConstants';

// Helper to get friendly names for opcodes
const getOpcodeName = (opcode: number): string => {
  return BLEOpcode[opcode] || `UNKNOWN_OPCODE_${opcode}`;
};

export const BluetoothDebugger = () => {
  const { sendPacket, isConnected } = useBLE();
  const [selectedOpcode, setSelectedOpcode] = useState<number | ''>('');
  // Store form values as a simple Record
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [validationError, setValidationError] = useState<string | null>(null);

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

  const handleOpcodeChange = (event: any) => {
    setSelectedOpcode(event.target.value);
    setFormData({});
    setValidationError(null);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setValidationError(null);
  };

  const handleSend = async () => {
    if (!SelectedPacketClass) return;

    try {
      let packetData: any = {};

      // If we have a schema, validate and parse
      if (SelectedPacketClass.schema) {
         // Validate with Zod (using safeParse to handle errors gracefully)
         const result = SelectedPacketClass.schema.safeParse(formData);

         if (!result.success) {
            const errorMsg = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
            setValidationError(errorMsg);
            return;
         }
         packetData = result.data;
      }

      // Instantiate the packet
      const packet = new SelectedPacketClass();

      // Populate properties.
      // Assumption: Constructor args match schema keys, OR public properties match schema keys.
      // Since we can't easily rely on constructor parameter order dynamically without reflection,
      // we assume the properties are public and assignable.
      Object.assign(packet, packetData);

      await sendPacket(packet);
      console.log('Packet sent successfully', packet);
    } catch (e: any) {
      console.error('Failed to send packet', e);
      setValidationError(e.message || 'Unknown error');
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Alert severity={isConnected ? 'success' : 'warning'}>
        {isConnected ? 'Connected to device' : 'Not connected (Packets will be queued or fail)'}
      </Alert>

      <FormControl fullWidth>
        <InputLabel>Select Packet Type</InputLabel>
        <Select
          value={selectedOpcode}
          label="Select Packet Type"
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
            Packet Parameters
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {schemaShape ? (
              Object.keys(schemaShape).length > 0 ? (
                Object.keys(schemaShape).map((key) => {
                  const fieldSchema = schemaShape[key];
                  // Determine input type (basic heuristic)
                  // We can inspect fieldSchema._def to guess type, or just default to text
                  // If it's a ZodNumber, use type="number"

                  // This is a rough check for Zod types
                  let isNumber = false;
                  let typeName = fieldSchema._def.typeName;
                   // Handle optional/nullable wrappers if needed, for now stick to basics
                   // or ZodCoerce
                  if (typeName === 'ZodNumber' || (typeName === 'ZodEffects' && fieldSchema._def.schema?._def.typeName === 'ZodNumber')) {
                      isNumber = true;
                  }

                  // Check if it is a coerce number
                  // In Zod 3.x, z.coerce.number() creates a ZodNumber with coerce: true flag, typeName is still ZodNumber

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
                <Typography color="text.secondary">No parameters required for this packet.</Typography>
              )
            ) : (
              <Typography color="text.secondary">No schema defined for this packet.</Typography>
            )}

            {validationError && (
                <Alert severity="error">{validationError}</Alert>
            )}

            <Button variant="contained" onClick={handleSend} disabled={!isConnected && !window.BOKS_SIMULATOR_ENABLED}>
              Send Packet
            </Button>
          </Box>
        </Paper>
      )}
    </Box>
  );
};
