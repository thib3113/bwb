import { useState, useRef } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Container,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography
} from '@mui/material';
import { PlayArrow, Stop } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { TFunction } from 'i18next';
import { useDevice } from '../hooks/useDevice';
import { useBLE } from '../hooks/useBLE';
import { BoksController } from '@thib3113/boks-sdk';

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
  run: (ctx: ScriptContext, services: { controller: BoksController }) => Promise<void>;
}

const ScriptCard = ({ script }: { script: ScriptDefinition }) => {
  const { t } = useTranslation('maintenance');
  const [running, setRunning] = useState(false);
  const [scriptStatus, setScriptStatus] = useState<
    'idle' | 'running' | 'finished' | 'stopped' | 'error'
  >('idle');
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { activeDevice } = useDevice();
  const { controller, isConnected } = useBLE();

  const stopRequested = useRef(false);

  const handleRun = async () => {
    // Basic checks
    if (!controller || !isConnected) {
      setError(t('status.not_connected'));
      return;
    }

    const configKey = activeDevice?.configuration_key;
    if (!configKey) {
      setError(t('status.missing_config_key'));
      return;
    }

    // Ensure credentials
    try {
      controller.setCredentials(configKey);
    } catch (e) {
      // ignore
    }

    setRunning(true);
    setScriptStatus('running');
    setProgress(0);
    setLogs([]);
    setError(null);
    stopRequested.current = false;

    const log = (msg: string) => setLogs((prev) => [...prev.slice(-4), msg]); // Keep last 5 logs

    try {
      await script.run(
        {
          setProgress,
          log,
          checkStop: () => {
            if (stopRequested.current) {
              throw new Error('STOPPED_BY_USER');
            }
          },
          t
        },
        { controller }
      );
      log(t('status.finished'));
      setScriptStatus('finished');
      setProgress(100);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === 'STOPPED_BY_USER') {
        setScriptStatus('stopped');
        log(t('status.stopped_user'));
      } else {
        setScriptStatus('error');
        setError(t('status.error', { message: msg }));
        log(t('status.error', { message: msg }));
      }
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card sx={{ mb: 2 }} data-testid={`script-card-${script.id}`} data-status={scriptStatus}>
      <CardContent>
        <Typography variant="h6" component="div">
          {t(script.titleKey)}
        </Typography>
        <Typography sx={{ mb: 1.5 }} color="text.secondary">
          {t(script.descriptionKey)}
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
              {t('progress', { percent: Math.round(progress) })}
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
                <ListItem key={i} disablePadding data-testid="maintenance-log-item">
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
        {!running ? (
          <Button size="small" variant="contained" startIcon={<PlayArrow />} onClick={handleRun}>
            {t('run')}
          </Button>
        ) : (
          <Button
            size="small"
            variant="contained"
            color="error"
            startIcon={<Stop />}
            onClick={() => {
              stopRequested.current = true;
            }}
          >
            {t('stop')}
          </Button>
        )}
      </CardActions>
    </Card>
  );
};

// --- Scripts Implementation ---

const cleanMasterCodesScript: ScriptDefinition = {
  id: 'clean_master_codes',
  titleKey: 'scripts.clean_master_codes.title',
  descriptionKey: 'scripts.clean_master_codes.description',
  run: async ({ setProgress, log, checkStop, t }, { controller }) => {
    log(t('status.fetching_count'));
    const counts = await controller.countCodes();
    let currentCount = counts.masterCount;
    log(t('status.initial_count', { count: currentCount }));

    if (currentCount === 0) {
      log(t('status.no_codes'));
      return;
    }

    const totalIndexes = 256;

    for (let i = 0; i < totalIndexes; i++) {
      checkStop();

      // Update progress
      const percent = (i / totalIndexes) * 100;
      setProgress(percent);

      // Deletion Loop for current index
      while (true) {
        checkStop();

        log(t('status.deleting_index', { index: i, count: currentCount }));

        let success = false;
        try {
          success = await controller.deleteMasterCode(i);

          if (success) {
            log(t('status.success_index', { index: i }));
            // Success implies there was a code? If so, try again?
            // Replicating original logic: if success, continue loop.
          } else {
            // If failed (likely code not found or error), stop retrying this index
            log(t('status.error_index', { index: i }));
          }
        } catch (_e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          log(t('status.error', { message: `Index ${i}: ${msg}` }));
          success = false;
        }

        if (!success) {
          break; // Exit inner loop, move to next index
        }
      }

      // After finishing an index, check global count if needed or rely on final check?
      // Original code checked count every index.
      if (i % 10 === 0) {
        const c = await controller.countCodes();
        currentCount = c.masterCount;
        if (currentCount === 0) {
          log(t('status.stopping_early'));
          break;
        }
      }
    }
  }
};

// --- Page Component ---

export const MaintenancePage = () => {
  const { t } = useTranslation('maintenance');

  return (
    <Container maxWidth="sm" sx={{ mt: 2, pb: 10 }}>
      <Typography variant="h4" gutterBottom>
        {t('title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        {t('description')}
      </Typography>

      <ScriptCard script={cleanMasterCodesScript} />
    </Container>
  );
};
