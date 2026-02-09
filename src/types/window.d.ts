import { BoksSimulator } from '../ble/simulator/BoksSimulator';
import { BoksDatabase } from '../db/db';

declare global {
  interface Window {
    boksSimulator?: BoksSimulator;
    boksSimulatorController?: unknown; // To be typed properly if possible, or use explicit type
    boksDebug?: {
      db?: BoksDatabase;
    };
    txEvents?: unknown[];
    _boks_tx_buffer?: unknown[];
    BOKS_SIMULATOR_ENABLED?: boolean;
    resetApp?: () => Promise<void>;
    toggleSimulator?: (enabled: boolean) => void;
  }
}

export {};
