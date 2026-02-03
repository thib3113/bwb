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
  Paper,
} from '@mui/material';
import { PlayArrow } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { TFunction } from 'i18next';
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
  t: TFunction;
}

interface ScriptDefinition {
  id: string;
  titleKey: string;
  descriptionKey: string;
  run: (
    ctx: ScriptContext,
    services: { bleService: BoksBLEService; configKey: string }
  ) => Promise<void>;
}

// --- Helper Components ---

const ScriptCard = ({ script }: { script: ScriptDefinition }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { t } = useTranslation(['maintenance'] as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tAny = t as any;
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { activeDevice } = useDevice(); // To check if connected/config key exists

  const handleRun = async () => {
    // Basic checks
    const bleService = BoksBLEService.getInstance();
    if (bleService.getState() !== 'connected') {
      setError(tAny('status.not_connected'));
      return;
    }

    const configKey = activeDevice?.configuration_key;
    if (!configKey) {
      setError(tAny('status.missing_config_key'));
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
          t,
        },
        { bleService, configKey }
      );
      log(tAny('status.finished'));
      setProgress(100);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      setError(tAny('status.error', { message: msg }));
      log(tAny('status.error', { message: msg }));
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" component="div">
          {tAny(script.titleKey)}
        </Typography>
        <Typography sx={{ mb: 1.5 }} color="text.secondary">
          {tAny(script.descriptionKey)}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {(running || logs.length > 0) && (
          <Box sx={{ width: '100%', mb: 2 }}>
            <LinearProgress variant="determinate" value={progress} />
            <Typography variant="body2" color="text.secondary" align="right">
              {tAny('progress', { percent: Math.round(progress) })}
            </Typography>
          </Box>
        )}

        {logs.length > 0 && (
          <Paper
            variant="outlined"
            sx={{ p: 1, bgcolor: 'background.default', maxHeight: 100, overflow: 'auto' }}
          >
            <List dense disablePadding>
              {logs.map((l, i) => (
                <ListItem key={i} disablePadding>
                  <ListItemText
                    primary={l}
                    primaryTypographyProps={{ variant: 'caption', fontFamily: 'monospace' }}
                  />
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
          {tAny('run')}
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
  titleKey: 'scripts.clean_master_codes.title',
  descriptionKey: 'scripts.clean_master_codes.description',
  run: async ({ setProgress, log, checkStop, t }, { bleService, configKey }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tAny = t as any;
    log(tAny('status.fetching_count'));
    let currentCount = await getMasterCount(bleService);
    log(tAny('status.initial_count', { count: currentCount }));

    if (currentCount === 0) {
      log(tAny('status.no_codes'));
      return;
    }

    const totalIndexes = 256;

    for (let i = 0; i < totalIndexes; i++) {
      checkStop();

      // Update progress
      const percent = (i / totalIndexes) * 100;
      setProgress(percent);

      // Deletion Loop for current index (handling multiple codes on same index)

      while (true) {
        checkStop();

        log(tAny('status.deleting_index', { index: i, count: currentCount }));

        const deletePacket = new DeleteMasterCodePacket(configKey, i);
        let shouldContinue = false;

        try {
          const response = (await bleService.sendRequest(
            deletePacket,
            { expectResponse: true },
            configKey
          )) as BLEPacket;

          if (response.opcode === BLEOpcode.CODE_OPERATION_SUCCESS) {
            log(tAny('status.success_index', { index: i }));
            shouldContinue = true; // Success implies there was a code, so there might be another
          } else if (response.opcode === BLEOpcode.CODE_OPERATION_ERROR) {
            // Error means likely empty or invalid index, so we stop retrying this index
            log(tAny('status.error_index', { index: i }));
            shouldContinue = false;
          }
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          log(tAny('status.error', { message: `Index ${i}: ${msg}` }));
          shouldContinue = false; // Stop on unexpected protocol error
        }

        if (!shouldContinue) {
          break; // Exit inner loop, move to next index
        }
      }

      // After finishing an index (cleaning it out), check global count
      currentCount = await getMasterCount(bleService);
      if (currentCount === 0) {
        log(tAny('status.stopping_early'));
        break; // Stop outer loop
      }
    }
  },
};

// --- Page Component ---

export const MaintenancePage = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { t } = useTranslation(['maintenance'] as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tAny = t as any;

  return (
    <Container maxWidth="sm" sx={{ mt: 2, pb: 10 }}>
      <Typography variant="h4" gutterBottom>
        {tAny('title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        {tAny('description')}
      </Typography>

      <ScriptCard script={cleanMasterCodesScript} />
    </Container>
  );
};
