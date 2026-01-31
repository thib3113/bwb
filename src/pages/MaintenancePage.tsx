import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Typography,
  LinearProgress,
  Container,
  Alert,
  List,
  ListItem,
  ListItemText,
  Divider,
  Paper
} from '@mui/material';
import { PlayArrow } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useDevice } from '../hooks/useDevice';
import { BoksBLEService } from '../services/BoksBLEService';
import { BLEOpcode } from '../utils/bleConstants';
import { DeleteMasterCodePacket } from '../ble/packets/PinManagementPackets';
import { CountCodesPacket } from '../ble/packets/StatusPackets';
import { BLEPacket } from '../utils/packetParser';

// --- Types ---

interface ScriptContext {
  setProgress: (value: number) => void;
  log: (message: string) => void;
  checkStop: () => void; // Throws if stopped
}

interface ScriptDefinition {
  id: string;
  title: string;
  description: string;
  run: (ctx: ScriptContext, services: { bleService: BoksBLEService; configKey: string }) => Promise<void>;
}

// --- Helper Components ---

const ScriptCard = ({ script }: { script: ScriptDefinition; onRun: (script: ScriptDefinition) => void }) => {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { activeDevice } = useDevice(); // To check if connected/config key exists

  const handleRun = async () => {
    // Basic checks
    const bleService = BoksBLEService.getInstance();
    if (bleService.getState() !== 'connected') {
      setError('Device not connected');
      return;
    }

    // Config key check
    // Logic: In V2, secret is in device_secrets table, merged into activeDevice by DeviceContext
    // type BoksDevice & Partial<DeviceSecrets>
    const configKey = activeDevice?.configuration_key;
    if (!configKey) {
      setError('Configuration Key is missing for this device.');
      return;
    }

    setRunning(true);
    setProgress(0);
    setLogs([]);
    setError(null);

    const log = (msg: string) => setLogs((prev) => [...prev.slice(-4), msg]); // Keep last 5 logs

    try {
      await script.run(
        {
          setProgress,
          log,
          checkStop: () => {
            // Stop functionality not implemented yet
          },
        },
        { bleService, configKey }
      );
      log('Script finished successfully.');
      setProgress(100);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Unknown error');
      log(`Error: ${err.message}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" component="div">
          {script.title}
        </Typography>
        <Typography sx={{ mb: 1.5 }} color="text.secondary">
          {script.description}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {running && (
          <Box sx={{ width: '100%', mb: 2 }}>
            <LinearProgress variant="determinate" value={progress} />
            <Typography variant="body2" color="text.secondary" align="right">
              {Math.round(progress)}%
            </Typography>
          </Box>
        )}

        {running && (
           <Paper variant="outlined" sx={{ p: 1, bgcolor: 'background.default', maxHeight: 100, overflow: 'auto' }}>
             <List dense disablePadding>
               {logs.map((l, i) => (
                 <ListItem key={i} disablePadding>
                   <ListItemText primary={l} primaryTypographyProps={{ variant: 'caption', fontFamily: 'monospace' }} />
                 </ListItem>
               ))}
             </List>
           </Paper>
        )}
      </CardContent>
      <CardActions>
        <Button
          size="small"
          variant="contained"
          startIcon={<PlayArrow />}
          onClick={handleRun}
          disabled={running}
        >
          Run
        </Button>
      </CardActions>
    </Card>
  );
};

// --- Scripts Implementation ---

const getMasterCount = async (bleService: BoksBLEService): Promise<number> => {
  const packet = new CountCodesPacket();
  // We expect a response
  const response = (await bleService.sendRequest(packet, { expectResponse: true })) as BLEPacket;

  if (response.opcode !== BLEOpcode.NOTIFY_CODES_COUNT) {
    throw new Error(`Unexpected response opcode: 0x${response.opcode.toString(16)}`);
  }

  // Parse payload [MasterMSB, MasterLSB, SingleMSB, SingleLSB]
  if (response.payload.length < 2) {
      throw new Error('Invalid payload length for CODES_COUNT');
  }

  const masterCount = (response.payload[0] << 8) | response.payload[1];
  return masterCount;
};

const cleanMasterCodesScript: ScriptDefinition = {
  id: 'clean_master_codes',
  title: 'Clean Master Codes',
  description: 'Deletes all master codes (indexes 0-255). Retries index if deletion successful.',
  run: async ({ setProgress, log, checkStop }, { bleService, configKey }) => {
    log('Fetching initial code count...');
    let currentCount = await getMasterCount(bleService);
    log(`Initial Master Code Count: ${currentCount}`);

    if (currentCount === 0) {
      log('No master codes found. Finished.');
      return;
    }

    const totalIndexes = 256;

    for (let i = 0; i < totalIndexes; i++) {
      checkStop();

      // Update progress
      const percent = (i / totalIndexes) * 100;
      setProgress(percent);

      if (currentCount === 0) {
        log('Count reached 0. Stopping early.');
        break;
      }

      // Deletion Loop for current index
      let retry = true;
      while (retry) {
        checkStop();
        retry = false;

        const prevCount = currentCount;

        log(`Deleting Index ${i} (Count: ${currentCount})...`);

        const deletePacket = new DeleteMasterCodePacket(configKey, i);
        // We expect SUCCESS (0x77) or ERROR (0x78)
        try {
             const response = (await bleService.sendRequest(deletePacket, { expectResponse: true }, configKey)) as BLEPacket;

             if (response.opcode === BLEOpcode.CODE_OPERATION_ERROR) {
                 // Likely empty index, move on
                 // log(`Index ${i} returned Error (Empty?), moving on.`);
             } else if (response.opcode === BLEOpcode.CODE_OPERATION_SUCCESS) {
                 // log(`Index ${i} deletion command sent.`);
             }
        } catch (e) {
            log(`Warning: Failed to delete index ${i}: ${e}`);
        }

        // Fetch count again to see if we should retry
        currentCount = await getMasterCount(bleService);

        if (currentCount < prevCount) {
          log(`Count dropped to ${currentCount}. Retrying index ${i}...`);
          retry = true; // Retry this index because codes might have shifted or multiple codes existed
          if (currentCount === 0) {
              retry = false;
          }
        } else {
            // Count didn't drop, move to next index
        }
      }
    }
  },
};

// --- Page Component ---

export const MaintenancePage = () => {
  const { t } = useTranslation();

  return (
    <Container maxWidth="sm" sx={{ mt: 2, pb: 10 }}>
       <Typography variant="h4" gutterBottom>
        Maintenance
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Execute maintenance scripts on the connected Boks device.
      </Typography>

      <ScriptCard
        script={cleanMasterCodesScript}
        onRun={() => {}}
      />

    </Container>
  );
};
