import { CodeCreationData } from '../types';
import { BLEPacket } from '../utils/packetParser';
import { BLEOpcode } from '../utils/bleConstants';
import { BLECommandOptions } from '../utils/BLEQueue';
import { BLEConnectionState, BluetoothDevice, BoksDevice, BoksCode, Settings } from '../types';
import { BoksTXPacket } from '../ble/packets/BoksTXPacket';
import { BatteryAnalysis, BatteryData } from '../hooks/useBatteryDiagnostics';
import { HardwareInference } from '../utils/bleUtils';
import { BoksTask } from '../types/task';

export { BLEOpcode };

export interface BLEContextType {
  device: BluetoothDevice | null;
  connectionState: BLEConnectionState;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: (customServices?: string[]) => Promise<void>;
  disconnect: () => void;
  sendPacket: (packet: BoksTXPacket | Uint8Array) => Promise<void>;
  sendRequest: (
    packetOrOpcode: BoksTXPacket | BLEOpcode,
    payloadOrOptions?: Uint8Array | BLECommandOptions,
    options?: BLECommandOptions
  ) => Promise<BLEPacket | BLEPacket[]>;
  getDeviceInfo: () => Promise<Record<string, string>>;
  getBatteryInfo: () => Promise<DataView | null>;
  readCharacteristic: (serviceUuid: string, charUuid: string) => Promise<DataView>;
  registerCallback: (opcode: number, callback: (packet: BLEPacket) => void) => void;
  unregisterCallback: (opcode: number) => void;
  addListener: (event: string | number, callback: (packet: BLEPacket) => void) => void;
  removeListener: (event: string | number, callback: (packet: BLEPacket) => void) => void;
  toggleSimulator?: (enable: boolean) => void;
}

export interface BoksContextType {
  doorStatus: 'open' | 'closed' | null;
  isOpening: boolean;
  openDoor: (code: string) => Promise<void>;
  isSynchronizing: boolean;
  setIsSynchronizing: (value: boolean) => void;
  syncLogs: () => Promise<void>;
}

export interface CodeContextType {
  createCode: (codeData: CodeCreationData) => Promise<void>;
  deleteCode: (codeData: string | BoksCode) => Promise<void>;
  onCodeUsed: (callback: (code: string) => void) => void;
}

export interface DeviceContextType {
  knownDevices: BoksDevice[];
  activeDevice: BoksDevice | null;
  activeDeviceId: string | null;
  codeCount: CodeCounts | null;
  logCount: number | null;
  registerDevice: (bleDevice: BluetoothDevice) => Promise<boolean>;
  updateDeviceName: (deviceId: string, newName: string) => Promise<void>;
  updateDeviceDetails: (deviceId: string, details: Partial<BoksDevice>) => Promise<void>;
  removeDevice: (deviceId: string) => Promise<void>;
  setActiveDevice: (deviceId: string | null) => void;
  refreshCodeCount: () => Promise<void>;
  updateDeviceBatteryLevel: (deviceId: string, batteryLevel: number) => Promise<void>;
  toggleLaPoste: (enable: boolean) => Promise<void>;
}

export interface DeviceLogContextType {
  isSyncingLogs: boolean;
  requestLogs: () => Promise<void>;
}

export interface ErrorContextType {
  lastError: string | null;
  clearError: () => void;
}

export interface LogEntry {
  timestamp: string;
  msg: string;
  type: string;
}

export interface DebugPacket {
  id: number;
  timestamp: Date;
  direction?: 'TX' | 'RX';
  opcode?: number;
  payload?: string;
  raw: string;
  type: 'packet' | 'system' | 'error';
}

export interface LogContextType {
  logs: LogEntry[];
  debugLogs: DebugPacket[];
  log: (msg: string, type?: string) => void;
  addDebugLog: (packet: DebugPacket) => void;
  clearDebugLogs: () => void;
  parseLog: (data: DataView) => BLEPacket | null;
}

export interface CodeCounts {
  master: number;
  single: number;
  total: number;
}

export interface DebugWizardState {
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

export interface SessionContextType {
  debugWizardState: DebugWizardState;
  updateDebugWizardState: (newState: Partial<DebugWizardState>) => void;
  resetDebugWizardState: () => void;
}

export interface SettingsContextType {
  settings: Settings;
  updateSetting: (key: keyof Settings, value: Settings[keyof Settings]) => void;
}

export interface TaskContextType {
  addTask: (task: Omit<BoksTask, 'id' | 'createdAt' | 'attempts' | 'status'>) => void;
  retryTask: (taskId: string) => void;
  tasks: BoksTask[];
  syncTasks: () => Promise<void>;
  isProcessing: boolean;
}

export interface ThemeContextType {
  mode: string;
  toggleTheme: () => void;
  setThemeMode: (newMode: string) => void;
}
