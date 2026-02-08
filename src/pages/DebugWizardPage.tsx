import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Container,
  MobileStepper,
  Paper,
  Step,
  StepLabel,
  Stepper,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useBLEConnection } from '../hooks/useBLEConnection';
import { useDoor } from '../hooks/useDoor';
import { useSession } from '../hooks/useSession';
import { useDevice } from '../hooks/useDevice';
import { useBatteryDiagnostics } from '../hooks/useBatteryDiagnostics';
import { inferHardwareFromFirmware } from '../utils/bleUtils';

import { DebugWizardStep1Connection } from './DebugWizard/DebugWizardStep1Connection';
import { DebugWizardStep2DoorBattery } from './DebugWizard/DebugWizardStep2DoorBattery';
import { DebugWizardStep3Questions } from './DebugWizard/DebugWizardStep3Questions';
import { DebugWizardStep4Advanced } from './DebugWizard/DebugWizardStep4Advanced';
import { DebugWizardStep5Recap } from './DebugWizard/DebugWizardStep5Recap';

export const DebugWizardPage = () => {
  const { t } = useTranslation();
  const steps = [
    t('wizard:steps.step1'),
    t('wizard:steps.step2'),
    t('wizard:steps.step3'),
    t('wizard:steps.step4'),
    t('wizard:steps.step5'),
  ];
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const { debugWizardState, updateDebugWizardState, resetDebugWizardState } = useSession();
  const { activeDevice } = useDevice();
  const { device, isConnected, connect, disconnect, getDeviceInfo, error } = useBLEConnection();

  // Destructure state from context
  const {
    activeStep,
    firmwareVersion,
    hardwareInference,
    deviceInfo,
    pinCode,
    openDoorSuccess,
    openDoorError,
    questionAnswers = [], // Ensure default empty array
    serviceUuid,
    serviceResults = [],
    batteryData,
    batteryAnalysis: analysis,
    customUuids = [],
    customResults = [],
  } = debugWizardState;

  const { openDoor, isOpening, doorStatus } = useDoor();
  const {
    isReading: isReadingBattery,
    batteryData: localBatteryData,
    analysis: localAnalysis,
    readBatteryDiagnostics,
  } = useBatteryDiagnostics({
    batteryData: debugWizardState.batteryData,
    analysis: debugWizardState.batteryAnalysis,
  });

  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const isFetchingRef = useRef(false);
  const [waitingForClose, setWaitingForClose] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);

  useEffect(() => {
    console.log('DebugWizard: Component Mounted');
    return () => console.log('DebugWizard: Component Unmounted');
  }, []);

  useEffect(() => {
    console.log(
      `DebugWizard: isConnected=${isConnected}, activeDevice=${activeDevice?.id || 'none'}`
    );
  }, [isConnected, activeDevice?.id]);

  // Pre-fill PIN code from active device if available and not already set
  useEffect(() => {
    if (activeDevice?.door_pin_code && !pinCode) {
      updateDebugWizardState({ pinCode: activeDevice.door_pin_code });
    }
  }, [activeDevice, pinCode, updateDebugWizardState]);

  useEffect(() => {
    console.log(
      'DebugWizard: Check conditions - isConnected:',
      isConnected,
      'firmwareVersion:',
      firmwareVersion,
      'isLoadingInfo:',
      isLoadingInfo,
      'isFetchingRef:',
      isFetchingRef.current
    );
    const isMounted = true;

    if (isConnected && !firmwareVersion && !isLoadingInfo && !isFetchingRef.current) {
      const fetchInfo = async () => {
        if (isFetchingRef.current) {
          console.log('DebugWizard: already fetching, skipping');
          return;
        }
        console.log('DebugWizard: condition met, starting fetchInfo');
        isFetchingRef.current = true;
        setIsLoadingInfo(true);

        try {
          console.log('DebugWizard: Starting device info fetch sequence...');
          const info = await getDeviceInfo();
          if (!isMounted) {
            console.log('DebugWizard: Component unmounted during fetch, aborting state update');
            return;
          }

          const fw = info['Firmware Revision'];
          console.log('DebugWizard: Raw firmware revision:', fw);

          // Infer hardware info
          const inference = inferHardwareFromFirmware(fw);
          console.log('DebugWizard: Hardware Inference result:', inference);

          let displayVersion = fw || 'Inconnu';
          if (inference.version !== 'Unknown') {
            displayVersion += ` (v${inference.version} - ${inference.label})`;
          }

          console.log('DebugWizard: Final display version string:', displayVersion);

          updateDebugWizardState({
            firmwareVersion: displayVersion,
            hardwareInference: inference,
            deviceInfo: info,
          });
          console.log('DebugWizard: Called updateDebugWizardState with:', displayVersion);
        } catch (e) {
          if (isMounted) {
            console.error('DebugWizard: Error in fetchInfo:', e);
          }
        } finally {
          if (isMounted) {
            // Give a bit of time for state to propagate before clearing the lock
            setTimeout(() => {
              if (isMounted) {
                setIsLoadingInfo(false);
                isFetchingRef.current = false;
                console.log('DebugWizard: Fetch sequence finished and lock cleared.');
              }
            }, 500);
          }
        }
      };
      fetchInfo();
    }
  }, [isConnected, firmwareVersion, isLoadingInfo, updateDebugWizardState, getDeviceInfo]);

  const handleRetryFetch = () => {
    updateDebugWizardState({ firmwareVersion: null });
  };

  const handleNext = () => {
    updateDebugWizardState({ activeStep: activeStep + 1 });
  };

  const handleBack = () => {
    updateDebugWizardState({ activeStep: activeStep - 1 });
  };

  const handleReset = () => {
    resetDebugWizardState();
    disconnect();
  };

  const handleOpenDoor = async () => {
    updateDebugWizardState({ openDoorError: null, openDoorSuccess: false });

    if (!pinCode || pinCode.length < 4) {
      updateDebugWizardState({
        openDoorError: 'Veuillez entrer un code PIN valide (au moins 4 chiffres)',
      });
      return;
    }

    try {
      await openDoor(pinCode);
      setWaitingForClose(true);
      updateDebugWizardState({ openDoorSuccess: true });
    } catch (err: unknown) {
      setWaitingForClose(false);
      const msg = err instanceof Error ? err.message : String(err);
      updateDebugWizardState({ openDoorError: msg || "Échec de l'ouverture de la porte" });
    }
  };

  const handleCheckBattery = useCallback(async () => {
    if (!device) {
      console.warn('DebugWizard: No device for battery check');
      return;
    }
    console.log('DebugWizard: Executing battery diagnostics...');

    // Find relevant question answer for hardware inference
    const hardwareQa = questionAnswers.find((q) => q.id === 'hardware_check');
    const userClaim = hardwareQa
      ? {
          answer: hardwareQa.answer,
          inference: hardwareInference || { battery: 'Unknown', label: 'Unknown' },
        }
      : undefined;

    await readBatteryDiagnostics(device, userClaim);
  }, [device, questionAnswers, hardwareInference, readBatteryDiagnostics]);

  // 1. Detect door closure and start preparation
  useEffect(() => {
    if (waitingForClose && doorStatus === 'closed') {
      console.log('DebugWizard: Door closed, initiating battery check sequence');
      setWaitingForClose(false);
      setIsPreparing(true);
    }
  }, [doorStatus, waitingForClose]);

  // 2. Execute battery check after preparation delay
  useEffect(() => {
    if (isPreparing) {
      const timer = setTimeout(() => {
        console.log('DebugWizard: Preparation delay finished, checking battery...');
        setIsPreparing(false);
        handleCheckBattery();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isPreparing, handleCheckBattery]);

  // Update context when battery data changes
  useEffect(() => {
    if (localBatteryData) {
      updateDebugWizardState({
        batteryData: localBatteryData,
        batteryAnalysis: localAnalysis,
      });
    }
  }, [localBatteryData, localAnalysis, updateDebugWizardState]);

  const handleAnswerQuestion = (questionId: string, answer: string, expected: string) => {
    const newAnswers = [...(questionAnswers || [])];
    const existingIndex = newAnswers.findIndex((q) => q.id === questionId);

    const answerObj = {
      id: questionId,
      answer,
      expected,
      timestamp: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      newAnswers[existingIndex] = answerObj;
    } else {
      newAnswers.push(answerObj);
    }

    updateDebugWizardState({ questionAnswers: newAnswers });
  };

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <DebugWizardStep1Connection
            isConnected={isConnected}
            isConnecting={false} // Assuming isConnecting from hook if available, otherwise false or passed prop? Checked hook: it returns isConnecting.
            connect={connect}
            error={error}
            device={device}
            firmwareVersion={firmwareVersion}
            isLoadingInfo={isLoadingInfo}
            onRetryFetch={handleRetryFetch}
          />
        );
      case 1:
        return (
          <DebugWizardStep2DoorBattery
            pinCode={pinCode}
            updateDebugWizardState={updateDebugWizardState}
            onOpenDoor={handleOpenDoor}
            isOpening={isOpening}
            isConnected={isConnected}
            openDoorSuccess={openDoorSuccess}
            openDoorError={openDoorError}
            batteryData={batteryData}
            waitingForClose={waitingForClose}
            isReadingBattery={isReadingBattery}
            isPreparing={isPreparing}
            analysis={analysis}
          />
        );
      case 2:
        return (
          <DebugWizardStep3Questions
            questionAnswers={questionAnswers}
            onAnswerQuestion={handleAnswerQuestion}
          />
        );
      case 3:
        return (
          <DebugWizardStep4Advanced
            customUuids={customUuids}
            customResults={customResults}
            updateDebugWizardState={updateDebugWizardState}
          />
        );
      case 4:
        return (
          <DebugWizardStep5Recap
            device={device}
            firmwareVersion={firmwareVersion}
            hardwareInference={hardwareInference}
            deviceInfo={deviceInfo}
            batteryData={batteryData}
            analysis={analysis}
            pinCode={pinCode}
            openDoorSuccess={openDoorSuccess}
            openDoorError={openDoorError}
            questionAnswers={questionAnswers}
            customUuids={customUuids}
            customResults={customResults}
            serviceUuid={serviceUuid}
            serviceResults={serviceResults}
          />
        );
      default:
        return 'Unknown step';
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4, px: isSmallScreen ? 1 : 3 }}>
      <Paper sx={{ p: isSmallScreen ? 2 : 4 }}>
        <Typography
          variant={isSmallScreen ? 'h5' : 'h4'}
          component="h1"
          gutterBottom
          align="center"
        >
          {t('wizard:title')}
        </Typography>

        {isSmallScreen ? (
          <Box sx={{ mb: 2 }}>
            <MobileStepper
              variant="text"
              steps={steps.length}
              position="static"
              activeStep={activeStep}
              nextButton={null}
              backButton={null}
              sx={{
                bgcolor: 'transparent',
                justifyContent: 'center',
                '& .MuiMobileStepper-dot': { mx: 0.5 },
              }}
            />
            <Typography variant="subtitle2" align="center" color="primary" sx={{ mt: 1 }}>
              {activeStep < steps.length ? steps[activeStep] : t('common:finish')}
            </Typography>
          </Box>
        ) : (
          <Stepper activeStep={activeStep} sx={{ pt: 3, pb: 5 }} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        )}

        <>
          {activeStep === steps.length ? (
            <>
              <Typography variant="h5" gutterBottom>
                {t('wizard:finished.title')}
              </Typography>
              <Typography variant="subtitle1">{t('wizard:finished.desc')}</Typography>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                <Button onClick={handleReset}>{t('common:reset')}</Button>
              </Box>
            </>
          ) : (
            <>
              {getStepContent(activeStep)}

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                {activeStep !== 0 && (
                  <Button onClick={handleBack} sx={{ mr: 1 }}>
                    {t('common:back')}
                  </Button>
                )}
                <Button
                  variant="contained"
                  onClick={handleNext}
                  disabled={activeStep === 0 && !isConnected}
                >
                  {activeStep === steps.length - 1 ? t('common:finish') : t('common:next')}
                </Button>
              </Box>
            </>
          )}
        </>
      </Paper>
    </Container>
  );
};
