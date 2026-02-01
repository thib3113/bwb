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

  // Versions
  firmware_revision?: string;
  software_revision?: string;
  hardware_version?: string;

  // Configuration
  la_poste_activated?: boolean;
}

export interface DeviceSecrets {
  device_id: string; // PK (FK to devices.id)
  configuration_key?: string;
  updated_at?: number;
}

export enum BoksNfcTagType {
  LA_POSTE = 0x01,
  VIGIK_TERTIARY = 0x02,
  USER_BADGE = 0x03,
}

export interface BoksNfcTag {
  id: string; // UUID
  device_id: string; // FK to BoksDevice.id
  uid: string; // Hex string (e.g. "04:A3:...")
  name: string;
  type: BoksNfcTagType | number;
  last_seen_at?: number;
  created_at: number;
  updated_at?: number;
  sync_status: SyncStatus;
}
