import Dexie, { Table } from 'dexie';
import { BoksCode, BoksLog, BoksSettings } from '../types';
import { BoksDevice, BoksNfcTag, BoksUser, DeviceSecrets } from '../types/db';
import { STORAGE_KEYS } from '../utils/constants';

export class BoksDatabase extends Dexie {
  devices!: Table<BoksDevice, string>;
  device_secrets!: Table<DeviceSecrets, string>;
  codes!: Table<BoksCode, string>;
  logs!: Table<BoksLog, string>;
  users!: Table<BoksUser, string>;
  settings!: Table<BoksSettings, string>;
  nfc_tags!: Table<BoksNfcTag, string>;

  constructor() {
    super(STORAGE_KEYS.DATABASE_NAME);

    // Schema version 1 - Consolidated version
    this.version(1).stores({
      users: '&id, updated_at',
      devices: '&id, ble_name, role, updated_at',
      device_secrets: '&device_id, updated_at',
      codes: '&id, device_id, author_id, status, updated_at',
      logs: '&id, device_id, timestamp, updated_at',
      settings: '&key, updated_at',
      nfc_tags: '&id, device_id, updated_at'
    });

    console.log(
      'Database initialized with tables:',
      this.tables.map((t) => t.name)
    );

    // Automatic updated_at hooks (Conditional to allow manual override during sync)
    this.tables.forEach((table) => {
      table.hook('creating', (_primKey, obj, transaction) => {
        // console.log(`[DB Hook] Creating in ${table.name}`, obj);
        const entity = obj as { updated_at?: number; device_id?: string };
        if (!entity.updated_at) {
          entity.updated_at = Date.now();
        }

        // Cascading update for device: Check if object has a device_id property
        // Prevent infinite loop: Don't update devices table if we are already in devices table
        if (entity.device_id && table.name !== 'devices') {
          // console.log(`[DB Hook] Cascading update to device ${entity.device_id}`);
          // Use transaction.on('complete') to schedule the update after the current transaction commits
          // This avoids "objectStore not found" errors without using setTimeout
          if (transaction) {
            transaction.on('complete', () => {
              this.devices.update(entity.device_id!, { updated_at: Date.now() }).catch((err) => {
                console.error('[DB Hook] Failed to update device:', err);
              });
            });
          } else {
            // Fallback if no transaction context (unlikely in hook)
            this.devices.update(entity.device_id, { updated_at: Date.now() }).catch((err) => {
              console.error('[DB Hook] Failed to update device (no tx):', err);
            });
          }
        }
      });

      table.hook('updating', (modifications, _primKey, obj, transaction) => {
        // console.log(`[DB Hook] Updating in ${table.name}`, modifications);
        const mods = modifications as Record<string, unknown>;
        const entity = obj as { device_id?: string };

        let newMods = modifications;
        if (!mods.updated_at) {
          newMods = { ...modifications, updated_at: Date.now() };
        }

        // Cascading update for device
        // Check modifications first (if device_id changed), then original object
        // Prevent infinite loop: Don't update devices table if we are already in devices table
        const deviceId = (mods.device_id as string) || entity.device_id;
        if (deviceId && table.name !== 'devices') {
          // console.log(`[DB Hook] Cascading update to device ${deviceId}`);

          if (transaction) {
            transaction.on('complete', () => {
              this.devices.update(deviceId, { updated_at: Date.now() }).catch((err) => {
                console.error('[DB Hook] Failed to update device:', err);
              });
            });
          } else {
            this.devices.update(deviceId, { updated_at: Date.now() }).catch((err) => {
              console.error('[DB Hook] Failed to update device (no tx):', err);
            });
          }
        }

        return newMods;
      });
    });

    // Ensure default user exists and check for schema integrity
    this.on('ready', async () => {
      try {
        // Verify critical tables exist by attempting a lightweight operation
        // This catches the case where DB version matches (1) but schema is different (missing tables)
        await this.settings.count();

        const count = await this.users.count();
        if (count === 0) {
          await this.users.add({
            id: 'local-user',
            is_offline: true,
            updated_at: Date.now()
          });
          console.log('Default local user created');
        }
      } catch (err: unknown) {
        const error = err as Error;
        console.error('Database integrity check failed:', error);
        if (error.name === 'NotFoundError' || error.message?.includes('object store')) {
          console.warn('Detected schema mismatch. Resetting database...');
          this.close(); // Close before deleting
          await this.delete();
          window.location.reload();
        }
      }
    });
  }
}

export const db: BoksDatabase = new BoksDatabase();

if (typeof window !== 'undefined') {
  window.boksDebug = window.boksDebug || {};
  window.boksDebug.db = db;
}
