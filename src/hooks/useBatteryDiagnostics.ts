import { useCallback, useState } from 'react';
import {
  BATTERY_INVALID_VALUE,
  BATTERY_LEVEL_CHAR_UUID,
  BATTERY_PROPRIETARY_CHAR_UUID,
  BATTERY_SERVICE_UUID,
  SERVICE_UUID,
} from '../utils/bleConstants';
import { BluetoothDevice } from '../types';
import { useBLEConnection } from './useBLEConnection';

export interface BatteryData {
  standardLevel: number | null;
  standardError: string | null;
  rawHex: string | null;
  serviceUuid: string | null;
  parsed: {
    format: string;
    level?: number;
    t1?: number;
    t5?: number;
    temp_C?: number;
    first_mV?: number;
    min_mV?: number;
    mean_mV?: number;
    max_mV?: number;
    last_mV?: number;
    batteryType?: string;
    consistency?: 'success' | 'warning' | 'error' | 'neutral';
    estimatedPercentage?: number | null;
    rawLength?: number;
  } | null;
  error: string | null;
}

export interface BatteryAnalysis {
  userClaimType: string | null;
  userClaimText: string;
  detectedType: string | null;
  detectedText: string;
  finalType: string;
  consistencyStatus: 'success' | 'warning' | 'error' | 'neutral';
  consistencyText: string;
}

export const useBatteryDiagnostics = (initialData?: {
  batteryData: BatteryData | null;
  analysis: BatteryAnalysis | null;
}) => {
  const { readCharacteristic } = useBLEConnection();
  const [isReading, setIsReading] = useState(false);
  const [batteryData, setBatteryData] = useState<BatteryData | null>(
    initialData?.batteryData || null
  );
  const [analysis, setAnalysis] = useState<BatteryAnalysis | null>(initialData?.analysis || null);

  const readBatteryDiagnostics = useCallback(
    async (
      device: BluetoothDevice,
      userClaimedHardware?: { answer: string; inference: { battery: string; label: string } }
    ) => {
      if (!device || !device.gatt || !device.gatt.connected) {
        throw new Error('Device not connected');
      }

      console.log('[BatteryDiag] Starting diagnostics using context read...');
      setIsReading(true);
      const data: BatteryData = {
        standardLevel: null,
        standardError: null,
        rawHex: null,
        serviceUuid: null,
        parsed: null,
        error: null,
      };

      try {
        // 1. Read Standard Battery Service
        try {
          console.log('[BatteryDiag] Reading Standard Battery Service...');
          const value = await readCharacteristic(BATTERY_SERVICE_UUID, BATTERY_LEVEL_CHAR_UUID);
          data.standardLevel = value.getUint8(0);
          console.log('[BatteryDiag] Standard Level:', data.standardLevel);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          console.warn('[BatteryDiag] Standard Battery Read Failed:', msg);
          data.standardError = msg;
        }

        // 2. Read Proprietary Battery Characteristic
        try {
          console.log('[BatteryDiag] Reading Proprietary Battery Characteristic...');
          const value = await readCharacteristic(SERVICE_UUID, BATTERY_PROPRIETARY_CHAR_UUID);
          const bytes = new Uint8Array(value.buffer);

          data.rawHex = Array.from(bytes)
            .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
            .join(' ');
          data.serviceUuid = SERVICE_UUID;
          console.log('[BatteryDiag] Proprietary Data (HEX):', data.rawHex);

          // Format detection based on byte length
          const byteLength = value.byteLength;
          let format = 'Unknown';
          if (byteLength === 1) format = 'Single Measure';
          else if (byteLength === 4) format = 'T1/T5/T10';
          else if (byteLength === 6) format = 'Min/Mean/Max';

          const parsedData: NonNullable<BatteryData['parsed']> = { format };

          if (byteLength === 1) {
            parsedData.level = value.getUint8(0);
          } else if (byteLength === 4) {
            parsedData.level = value.getUint8(0);
            parsedData.t1 = value.getUint8(1);
            parsedData.t5 = value.getUint8(2);
            parsedData.temp_C = value.getUint8(3) - 25;
          } else if (byteLength === 6) {
            const v = new Uint8Array(value.buffer);

            // Check for invalid values (0xFF = 255)
            const isInvalid = (val: number) => val === BATTERY_INVALID_VALUE;

            if (
              isInvalid(v[0]) &&
              isInvalid(v[1]) &&
              isInvalid(v[2]) &&
              isInvalid(v[3]) &&
              isInvalid(v[4])
            ) {
              data.error = 'Données invalides (255)';
            } else {
              parsedData.first_mV = v[0] === BATTERY_INVALID_VALUE ? null : v[0] * 100;
              parsedData.min_mV = v[1] === BATTERY_INVALID_VALUE ? null : v[1] * 100;
              parsedData.mean_mV = v[2] === BATTERY_INVALID_VALUE ? null : v[2] * 100;
              parsedData.max_mV = v[3] === BATTERY_INVALID_VALUE ? null : v[3] * 100;
              parsedData.last_mV = v[4] === BATTERY_INVALID_VALUE ? null : v[4] * 100;
              parsedData.temp_C = v[5] === BATTERY_INVALID_VALUE ? null : v[5] - 25;
            }
          } else {
            parsedData.rawLength = byteLength;
          }

          data.parsed = parsedData;
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error('[BatteryDiag] Proprietary Read Error:', msg);
          data.error = msg;
        }

        setBatteryData(data);

        // 3. Perform Analysis if we have proprietary data
        if (data.parsed) {
          try {
            const analysisResult = analyzeBatteryDataHelper(data, userClaimedHardware);
            setAnalysis(analysisResult);
          } catch (e: unknown) {
            console.error('Error analyzing battery data:', e);
            const msg = e instanceof Error ? e.message : String(e);
            data.error = (data.error || '') + ` | Analysis failed: ${msg}`;
          }
        }
      } catch (err) {
        console.error('[BatteryDiag] Global Error:', err);
      } finally {
        setIsReading(false);
      }
    },
    [readCharacteristic]
  );

  return {
    isReading,
    batteryData,
    analysis,
    readBatteryDiagnostics,
  };
};

// Helper function to analyze battery data
export function analyzeBatteryDataHelper(
  data: BatteryData,
  userClaim?: { answer: string; inference: { battery: string; label: string } }
): BatteryAnalysis {
  const result: BatteryAnalysis = {
    userClaimType: null,
    userClaimText: 'Inconnue',
    detectedType: 'Unknown',
    detectedText: 'Incertain',
    finalType: 'aaa',
    consistencyStatus: 'neutral',
    consistencyText: '',
  };

  if (!data.parsed) {
    result.consistencyStatus = 'error';
    result.consistencyText = 'Données propriétaires non disponibles';
    return result;
  }

  const last_mV = data.parsed.last_mV;

  // User Claim Logic
  if (userClaim) {
    if (userClaim.answer === 'Oui' && userClaim.inference) {
      result.userClaimType = userClaim.inference.battery;
      result.userClaimText = userClaim.inference.label + ' (Confirmé)';
    } else if (userClaim.answer === 'Non') {
      result.userClaimText = "Infirmé par l'utilisateur";
      result.userClaimType = 'rejected';
    } else if (userClaim.answer === 'Inconnu') {
      result.userClaimText = 'Inconnu (Utilisateur)';
      result.userClaimType = 'unknown';
    }
  }

  // Voltage Detection Logic
  if (last_mV) {
    if (last_mV > 5000) {
      result.detectedType = 'aaa';
      result.detectedText = '8x AAA ( > 5V )';
    } else if (last_mV < 4500) {
      result.detectedType = 'lsh14';
      result.detectedText = 'LSH14 ( < 4.5V )';
    } else {
      result.detectedText = `Ambigu (${(last_mV / 1000).toFixed(2)}V)`;
    }
  }

  // Final Decision & Consistency
  if (result.userClaimType === 'aaa' || result.userClaimType === 'lsh14') {
    if (result.detectedType !== 'Unknown') {
      if (result.userClaimType === result.detectedType) {
        result.finalType = result.detectedType || 'aaa';
        result.consistencyStatus = 'success';
        result.consistencyText = '✅ Cohérent : Le voltage confirme le matériel.';
      } else {
        result.finalType = result.detectedType || 'aaa'; // Trust Physics over User
        result.consistencyStatus = 'error';
        result.consistencyText = '❌ Incohérence : Le voltage contredit le matériel déclaré !';
      }
    } else {
      result.finalType = result.userClaimType;
      result.consistencyStatus = 'warning';
      result.consistencyText = '⚠️ Voltage ambigu, utilisation du type déclaré.';
    }
  } else {
    if (result.detectedType !== 'Unknown') {
      result.finalType = result.detectedType || 'aaa';
      result.consistencyStatus = 'success';
      result.consistencyText = 'ℹ️ Type déduit automatiquement du voltage.';
    } else {
      result.finalType = 'aaa';
      result.consistencyStatus = 'warning';
      result.consistencyText =
        '⚠️ Impossible de déterminer le type (Voltage ambigu). Par défaut : AAA.';
    }
  }

  return result;
}
