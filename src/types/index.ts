export type CodeType = 'master' | 'single' | 'multi';

export enum UserRole {
  Owner = 'owner',
  Admin = 'admin',
  Reader = 'reader',
}

export type SyncStatus = 'synced' | 'created' | 'updated' | 'deleted';
export type BLEConnectionState =
  | 'disconnected'
  | 'scanning'
  | 'connecting'
  | 'connected'
  | 'disconnecting';

// Define CodeStatus as a union type of string literals
export type CodeStatus =
  | 'pending_add' // BLE: On Admin phone, waiting for Boks connection
  | 'on_device' // BLE: Active on Boks
  | 'pending_delete' // BLE: To be removed from Boks
  | 'rejected' // Cloud: Rejected
  | 'synced'; // Alias for on_device (legacy compatibility)

// Augment global Window interface for non-standard browser properties and debug tools
declare global {
  interface Window {
    BOKS_SIMULATOR_ENABLED?: boolean;
    enableBoksSimulator?: () => void;
    opera?: string;
    MSStream?: unknown;
    boksDebug: {
      mockData?: (mockDeviceId?: string) => Promise<void>;
      StorageService?: unknown;
      db?: unknown;
      [key: string]: unknown;
    };
  }
}

export interface BoksUser {
  id: string; // UUID
  email?: string;
  is_offline: boolean;
  updated_at?: number;
}

export interface BoksDevice {
  id: string; // UUID
  ble_name: string; // Unique Identifier from BLE (MAC or UUID)
  friendly_name: string;
  configuration_key?: string; // configuration Key. If present, user is Admin.
  door_pin_code?: string;
  role: UserRole;
  sync_status: SyncStatus;
  last_connected_at?: number;
  last_sync_at?: number;
  updated_at?: number;

  // Counters
  master_code_count?: number;
  single_code_count?: number;
  log_count?: number;

  // Battery level
  battery_level?: number;

  // Firmware Info
  hardware_version?: string;
  firmware_revision?: string;
  software_revision?: string;
  la_poste_activated?: boolean;
}

export interface BoksCode {
  id: string; // UUID
  device_id: string; // FK to BoksDevice.id
  author_id: string; // FK to User
  type: CodeType;
  code: string;
  name: string; // Alias friendly name (was description)
  index?: number; // 0-255 (Master only)
  status: CodeStatus;
  created_at: string;
  updated_at?: number;
  sync_status: SyncStatus;

  // Legacy fields mapping
  description?: string; // Alias for name
  deviceId?: string; // Alias for device_id
  createdAt?: string; // Alias for created_at
  uses?: number;
  maxUses?: number;
  expiresAt?: string;
  usedAt?: string;
}

export interface CodeMetadata {
  used?: boolean;
  usedDate?: Date;
  lastUsed?: Date;
  usesRemaining?: number;
}

export interface CodeCreationData {
  type: CodeType;
  code: string;
  name?: string;
  index?: number;
  maxUses?: number;
}

export interface LogData {
  age?: number;
  timestamp?: number;
  code?: string;
  macAddress?: string;
  reason_code?: number;
  error_subtype?: number;
  error_code?: number;
  error_internal_code?: number;
  level?: number;
  temperature?: number;
  format?: string;
  count?: number;
  success?: boolean;
  master?: number;
  single?: number;
  [key: string]: unknown;
}

export interface BoksLog {
  id?: string; // UUID (was number)
  device_id: string; // FK
  timestamp: string | number;
  event: string;
  type: string;
  data?: LogData;
  opcode: number;
  payload: Uint8Array;
  raw: Uint8Array;
  synced: boolean; // Synced to Cloud?
  updated_at?: number;

  // Legacy
  deviceId?: string;
}

export interface Settings {
  autoImport: boolean;
  lastActiveDeviceId?: string;
  language?: string;
  theme?: string;
  [key: string]: unknown; // Allow other settings for flexibility
}

export interface BoksSettings {
  key: string;
  value: string | number | boolean | object | null;
  updated_at?: number;
}

// Web Bluetooth API types (simplified)
export interface BluetoothDevice {
  id: string;
  name?: string;
  gatt?: BluetoothRemoteGATTServer;
  watchAdvertisements(): Promise<void>;
  unwatchAdvertisements(): Promise<void>;
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
}

export interface BluetoothRemoteGATTServer {
  device: BluetoothDevice;
  connected: boolean;
  connect(): Promise<BluetoothRemoteGATTServer>;
  disconnect(): void;
  getPrimaryService(service: BluetoothServiceUUID): Promise<BluetoothRemoteGATTService>;
  getPrimaryServices(service?: BluetoothServiceUUID): Promise<BluetoothRemoteGATTService[]>;
}

export interface BluetoothRemoteGATTService {
  device: BluetoothDevice;
  uuid: string;
  isPrimary: boolean;
  getCharacteristic(
    characteristic: BluetoothCharacteristicUUID
  ): Promise<BluetoothRemoteGATTCharacteristic>;
  getCharacteristics(
    characteristic?: BluetoothCharacteristicUUID
  ): Promise<BluetoothRemoteGATTCharacteristic[]>;
}

export interface BluetoothRemoteGATTCharacteristic {
  service: BluetoothRemoteGATTService;
  uuid: string;
  properties: BluetoothCharacteristicProperties;
  value?: DataView;
  getDescriptor(descriptor: BluetoothRemoteGATTDescriptor): Promise<BluetoothRemoteGATTDescriptor>;
  readValue(): Promise<DataView>;
  writeValue(value: BufferSource): Promise<void>;
  startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
  stopNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
}

export interface BluetoothCharacteristicProperties {
  broadcast: boolean;
  read: boolean;
  writeWithoutResponse: boolean;
  write: boolean;
  notify: boolean;
  indicate: boolean;
  authenticatedSignedWrites: boolean;
  reliableWrite: boolean;
  writableAuxiliaries: boolean;
}

export interface BluetoothRemoteGATTDescriptor {
  characteristic: BluetoothRemoteGATTCharacteristic;
  uuid: string;
  value?: DataView;
  readValue(): Promise<DataView>;
  writeValue(value: BufferSource): Promise<void>;
}

export type BluetoothServiceUUID = number | string;
export type BluetoothCharacteristicUUID = number | string;
export type BluetoothDescriptorUUID = number | string;

export interface ExportData {
  version?: number;
  timestamp?: string;
  settings: {
    autoImport: boolean;
    language: string;
    theme: string;
  };
  devices: {
    id: string;
    name: string;
    configuration_key?: string;
    door_pin_code?: string;
  }[];
  codes: Array<Partial<BoksCode> & { deviceId: string }>;
}
