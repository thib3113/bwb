import { SyncStatus, UserRole } from './index';

export interface BoksUser {
  id: string; // Supabase User ID
  email?: string;
  premium_until?: string | number | null;
  theme?: string;
  language?: string;
  updated_at?: number;
}

export interface BoksDevice {
  id: string; // UUID
  ble_name: string; // Unique Identifier from BLE (MAC or UUID)
  friendly_name: string;
  role: UserRole;
  sync_status: SyncStatus;
  last_connected_at?: number;
  last_sync_at?: number;
  updated_at?: number;
  premium_until?: string | number | null; // Date de fin premium (Cloud ou simulé)

  // Counters
  master_code_count?: number;
  single_code_count?: number;
  log_count?: number;

  // Battery level
  battery_level?: number;
}

export interface DeviceSecrets {
  device_id: string; // PK (FK to devices.id)
  configuration_key?: string;
  updated_at?: number;
}
