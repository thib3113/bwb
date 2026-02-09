import { BoksSimulator, SimulatorAPI } from '../ble/simulator/BoksSimulator';
import { BoksDatabase } from '../db/db';

declare global {
  interface Window {
    // Simulator & Debug Flags
    BOKS_SIMULATOR_ENABLED?: boolean;
    enableBoksSimulator?: () => void;
    toggleSimulator?: (enabled: boolean) => void;
    resetApp?: () => Promise<void>;

    // Simulator State & Control
    boksSimulator?: BoksSimulator;
    boksSimulatorController?: SimulatorAPI;

    // Event Buffers
    _boks_tx_buffer?: Array<{ opcode: number; payload: number[] }>;
    txEvents?: Array<{ opcode: number; payload: number[] }>;

    // Browser Detection
    opera?: string;
    MSStream?: unknown;

    // Debug Tools exposed to window
    boksDebug?: {
      mockData?: (mockDeviceId?: string) => Promise<void>;
      StorageService?: unknown;
      db?: BoksDatabase;
      [key: string]: unknown;
    };
  }
}

export {};
