export enum CODE_TYPE {
  MASTER = 'master',
  SINGLE = 'single',
  MULTI = 'multi'
}

export enum UserRole {
  Owner = 'owner',
  Admin = 'admin',
  Reader = 'reader'
}

export type SyncStatus = 'synced' | 'created' | 'updated' | 'deleted';
export type BLEConnectionState =
  | 'disconnected'
  | 'scanning'
  | 'connecting'
  | 'connected'
  | 'disconnecting';

export type CodeStatus =
  | 'pending_add' // BLE: On Admin phone, waiting for Boks connection
  | 'on_device' // BLE: Active on Boks
  | 'pending_delete' // BLE: To be removed from Boks
  | 'rejected' // Cloud: Rejected
  | 'synced'; // Alias for on_device (legacy compatibility)
