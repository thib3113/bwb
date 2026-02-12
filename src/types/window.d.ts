import { BoksSimulator } from '../ble/simulator/BoksSimulator';
import { BoksDatabase } from '../db/db';
import { StorageService } from '../services/StorageService';

declare global {
  interface Window {
    // Simulator & Debug Flags
    BOKS_SIMULATOR_ENABLED?: boolean;
    BOKS_SIMULATOR_DISABLED?: boolean;
    enableBoksSimulator?: () => void;
    toggleSimulator?: (enabled: boolean) => void;
    resetApp?: () => Promise<void>;

    // Simulator State & Control
    boksSimulator?: BoksSimulator;

    // Event Buffers for Playwright
    _boks_tx_buffer?: Array<{ opcode: number; payload: number[] }>;
    txEvents?: Array<{ opcode: number; payload: number[] }>;

    // Browser Detection (Legacy/External)
    opera?: string;
    MSStream?: unknown;

    // Debug Tools exposed to window
    boksDebug?: {
      mockData?: (mockDeviceId?: string) => Promise<void>;
      StorageService?: typeof StorageService;
      db?: BoksDatabase;
      [key: string]: unknown;
    };
  }
}

export {};
