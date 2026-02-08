import { SyncStatus, UserRole } from './index';

export interface BoksUser {
  id: string;
  email?: string;
  is_offline?: boolean;
  premium_until?: string | number | null;
  theme?: string;
  language?: string;
  updated_at?: number;
}

export interface BoksDevice {
  id: string;
  ble_name: string;
  friendly_name: string;
  door_pin_code?: string;
  role: UserRole;
  sync_status: SyncStatus;
  last_connected_at?: number;
  last_sync_at?: number;
  updated_at?: number;
  premium_until?: string | number | null;

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
  device_id: string;
  configuration_key?: string;
  door_pin_code?: string;
  updated_at?: number;
}

export enum BoksNfcTagType {
  LA_POSTE = 0x01,
  VIGIK_TERTIARY = 0x02,
  USER_BADGE = 0x03
}

export interface BoksNfcTag {
  id: string;
  device_id: string;
  uid: string;
  name: string;
  type: BoksNfcTagType | number;
  last_seen_at?: number;
  created_at: number;
  updated_at?: number;
  sync_status: SyncStatus;
}
