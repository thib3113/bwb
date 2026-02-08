import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { SERVICE_UUID } from '../utils/bleConstants';
import { SessionContext } from './Contexts';
import { BatteryAnalysis, BatteryData } from '../hooks/useBatteryDiagnostics';
import { HardwareInference } from '../utils/bleUtils';

interface DebugWizardState {
  activeStep: number;
  firmwareVersion: string | null;
  hardwareInference: HardwareInference | null;
  deviceInfo: Record<string, string> | null;
  pinCode: string;
  batteryLevel: number | null;
  batteryData: BatteryData | null;
  batteryAnalysis: BatteryAnalysis | null;
  openDoorSuccess: boolean;
  openDoorError: string | null;
  serviceUuid: string;
  serviceResults: Array<{ uuid: string; value: string }>;
  questionAnswers: Array<{ id: string; answer: string; expected?: string; timestamp?: string }>;
  customUuids: string[];
  customResults: Array<{ serviceUuid: string; charUuid: string; value: string; timestamp: string }>;
}

const defaultDebugWizardState: DebugWizardState = {
  activeStep: 0,
  firmwareVersion: null,
  hardwareInference: null,
  deviceInfo: null,
  pinCode: '',
  batteryLevel: null,
  batteryData: null,
  batteryAnalysis: null,
  openDoorSuccess: false,
  openDoorError: null,
  serviceUuid: SERVICE_UUID, // SERVICE_UUID default
  serviceResults: [],
  questionAnswers: [],
  customUuids: [],
  customResults: []
};

export const SessionProvider = ({ children }: { children: ReactNode }) => {
  useEffect(() => {
    console.log('[SessionProvider] Initialized');
  }, []);

  const [debugWizardState, setDebugWizardState] =
    useState<DebugWizardState>(defaultDebugWizardState);

  const updateDebugWizardState = useCallback((newState: Partial<DebugWizardState>) => {
    setDebugWizardState((prev) => ({
      ...prev,
      ...newState
    }));
  }, []);

  const resetDebugWizardState = useCallback(() => {
    setDebugWizardState(defaultDebugWizardState);
  }, []);

  const value = useMemo(
    () => ({
      debugWizardState,
      updateDebugWizardState,
      resetDebugWizardState
    }),
    [debugWizardState, updateDebugWizardState, resetDebugWizardState]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};
