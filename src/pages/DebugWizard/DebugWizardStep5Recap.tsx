import React, { useState } from 'react';
import { Alert, Box, Button, IconButton, Snackbar, TextField, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import GitHubIcon from '@mui/icons-material/GitHub';
import { GITHUB_NEW_ISSUE_URL } from '../../utils/constants';
import { BluetoothDevice } from '../../types';
import { HardwareInference } from '../../utils/bleUtils';
import { BatteryAnalysis, BatteryData } from '../../hooks/useBatteryDiagnostics';

interface QuestionAnswer {
  id: string;
  answer: string;
  expected?: string;
  timestamp?: string;
}

interface CustomResult {
  serviceUuid: string;
  charUuid: string;
  value: string;
  timestamp: string;
}

interface DebugWizardStep5RecapProps {
  device: BluetoothDevice | null;
  firmwareVersion: string | null;
  hardwareInference: HardwareInference | null;
  deviceInfo: Record<string, string> | null;
  batteryData: BatteryData | null;
  analysis: BatteryAnalysis | null;
  pinCode: string;
  openDoorSuccess: boolean;
  openDoorError: string | null;
  questionAnswers: QuestionAnswer[];
  customUuids: string[];
  customResults: CustomResult[];
  serviceUuid?: string;
  serviceResults?: CustomResult[]; // Assuming same structure
}

export const DebugWizardStep5Recap: React.FC<DebugWizardStep5RecapProps> = ({
  device,
  firmwareVersion,
  hardwareInference,
  deviceInfo,
  batteryData,
  analysis,
  pinCode,
  openDoorSuccess,
  openDoorError,
  questionAnswers,
  customUuids,
  customResults,
  serviceUuid,
  serviceResults,
}) => {
  const { t } = useTranslation(['wizard', 'common', 'codes']);
  const [copySuccess, setCopySuccess] = useState(false);

  const recapData = {
    device: {
      name: device?.name,
      id: device?.id,
      firmwareVersion,
      hardwareInference,
      deviceInfo,
    },
    status: {
      battery: batteryData,
      analysis: analysis,
      doorTest: {
        attempted: !!pinCode,
        success: openDoorSuccess,
        error: openDoorError,
      },
    },
    questionAnswers,
    customDiscovery: {
      uuids: customUuids,
      results: customResults,
    },
    advanced: {
      serviceUuid,
      results: serviceResults,
    },
    timestamp: new Date().toISOString(),
  };

  const jsonString = JSON.stringify(recapData, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopySuccess(true);
  };

  const isUnknownVersion = !hardwareInference || hardwareInference.version === 'Unknown';
  const hasCustomResults = customResults.length > 0;
  const hasInconsistency =
    analysis?.consistencyStatus === 'error' || analysis?.consistencyStatus === 'warning';
  const hasScale = questionAnswers.find((q) => q.id === 'has_scale' && q.answer === 'Oui');
  const hasSpecial = questionAnswers.find((q) => q.id === 'anything_special' && q.answer === 'Oui');

  const isInteresting =
    isUnknownVersion || hasCustomResults || hasInconsistency || hasScale || hasSpecial;

  const getGithubUrl = () => {
    const title = `Debug Data: ${device?.name || 'Unknown Boks'} - ${firmwareVersion || 'Unknown FW'}`;
    const codeBlock = '```';
    const body = `Please find below the debug data captured via the Boks Web BLE tool.\n\n${codeBlock}json\n${jsonString}\n${codeBlock}`;

    const params = new URLSearchParams();
    params.set('title', title);
    params.set('body', body);
    return `${GITHUB_NEW_ISSUE_URL}?${params.toString()}`;
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        {t('recap.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t('recap.desc')}
      </Typography>

      {isInteresting && (
        <Alert
          severity="info"
          icon={<GitHubIcon />}
          sx={{ mb: 3 }}
          action={
            <Button
              color="inherit"
              size="small"
              href={getGithubUrl()}
              target="_blank"
              onClick={() => {
                if (!copySuccess) {
                  // We allow the click because we pre-fill, but copying is still good
                }
              }}
            >
              {' '}
              {t('recap.open_issue')}
            </Button>
          }
        >
          {t('recap.interesting_found')}
        </Alert>
      )}

      <Box sx={{ position: 'relative' }}>
        <TextField
          multiline
          fullWidth
          minRows={10}
          maxRows={20}
          value={jsonString}
          variant="outlined"
          InputProps={{
            readOnly: true,
            style: { fontFamily: 'monospace', fontSize: '0.875rem' },
          }}
        />
        <IconButton
          onClick={handleCopy}
          sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'background.paper' }}
          title={t('codes:copy_to_clipboard')}
        >
          <ContentCopyIcon />
        </IconButton>
      </Box>

      <Snackbar
        open={copySuccess}
        autoHideDuration={3000}
        onClose={() => setCopySuccess(false)}
        message="Données de débogage copiées dans le presse-papier"
      />
    </Box>
  );
};
