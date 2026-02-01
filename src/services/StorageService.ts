import { db } from '../db/db';
import { BoksCode, BoksDevice, BoksLog, CodeStatus, UserRole, Settings } from '../types';
import { BoksNfcTag } from '../types/db';
import { APP_DEFAULTS, CODE_TYPES } from '../utils/constants';
import { BLEOpcode } from '../utils/bleConstants';

export class StorageService {
  /**
   * Save codes for a specific Boks device
   */
  static async saveCodes(deviceId: string, codes: Partial<BoksCode>[]): Promise<void> {
    if (!deviceId) return;

    try {
      const codesToAdd = codes.map(
        (code) =>
          ({
            id: code.id || crypto.randomUUID(),
            device_id: deviceId,
            author_id: code.author_id || APP_DEFAULTS.AUTHOR_ID, // Default author
            type: code.type || CODE_TYPES.SINGLE,
            code: code.code || '000000',
            name: code.name || code.description || 'Unnamed Code',
            status: code.status || 'pending_add',
            sync_status: code.sync_status || 'created', // New codes need sync
            created_at: code.created_at || code.createdAt || new Date().toISOString(),
            ...code,
          }) as BoksCode
      );

      if (codesToAdd.length > 0) {
        await db.codes.bulkPut(codesToAdd);
      }
    } catch (error) {
      console.error(`Failed to save codes for device ${deviceId}:`, error);
      throw error;
    }
  }

  static async loadCodes(deviceId: string): Promise<BoksCode[]> {
    if (!deviceId) return [];
    try {
      return await db.codes.where('device_id').equals(deviceId).toArray();
    } catch (error) {
      console.error(`Failed to load codes for device ${deviceId}:`, error);
      return [];
    }
  }

  static async saveLogs(deviceId: string, logs: Partial<BoksLog>[]): Promise<void> {
    if (!deviceId) return;

    try {
      const logsToAdd: BoksLog[] = [];
      const tagsToUpdate: BoksNfcTag[] = [];

      for (const log of logs) {
        // Prepare Log
        const logEntry = {
          id: log.id || crypto.randomUUID(),
          device_id: deviceId,
          timestamp: log.timestamp || new Date().toISOString(),
          event: log.event || 'UNKNOWN',
          type: log.type || 'info',
          synced: log.synced || false,
          ...log,
        } as BoksLog;
        logsToAdd.push(logEntry);

        // Check for NFC Tags in log details
        // @ts-expect-error - 'details' comes from parseLog but is not on BoksLog interface
        const details = log.details as Record<string, unknown> | undefined;
        if (details && typeof details.tag_uid === 'string') {
          tagsToUpdate.push({
            id: crypto.randomUUID(), // New ID, but we might overwrite based on logic below
            device_id: deviceId,
            uid: details.tag_uid,
            name: 'Utilisateur ' + details.tag_uid.substring(0, 5), // Default name
            type: (details.tag_type as number) || 0,
            last_seen_at: Date.now(),
            created_at: Date.now(), // Will be ignored if updating
            sync_status: 'created',
          });
        }
      }

      if (logsToAdd.length > 0) {
        await db.logs.bulkPut(logsToAdd);
      }

      // Upsert Tags
      if (tagsToUpdate.length > 0) {
        for (const tag of tagsToUpdate) {
          // Check if exists to preserve name
          const existing = await db.nfc_tags.where({ device_id: deviceId, uid: tag.uid }).first();
          if (existing) {
            await db.nfc_tags.update(existing.id, {
              last_seen_at: tag.last_seen_at,
              // Only update type if meaningful? Assuming log type is correct.
              type: tag.type,
            });
          } else {
            // Only add if "User Badge" (0x03) or generic?
            // Requirement: "logs vont des fois contenir des tag_uid ... avec un tag type 'USER' => ça veut donc dire qu'il fait partie des badges autorisés"
            // So we blindly add all observed tags?
            // "Pour en ajouter, il faut lancer un scan ... Une fois le tag trouvé, on propose à l'utilisateur de l'ajouter"
            // So maybe we ONLY update `last_seen_at` if it exists, and AUTO-ADD only if it is explicitly type 0x03 (User Badge) which implies it IS authorized?
            // User said: "logs vont des fois contenir des tag_uid . avec un tage type 'USER' => ça veut donc dire qu'il fait partie des badges autorisés"
            // So if type is 0x03, we should ADD it if not present.
            // But if type is something else (e.g. unknown), maybe we just ignore if not present?
            // Let's assume if it's in the log with type 0x03, it is an authorized tag.
            // If it is 0xA1 (NFC_OPENING), it opened the door, so it MUST be authorized (or master).
            // Let's just add it.

            // Use the tag object we prepared
            await db.nfc_tags.add(tag);
          }
        }
      }
    } catch (error) {
      console.error(`Failed to save logs for device ${deviceId}:`, error);
      throw error;
    }
  }

  static async loadLogs(deviceId: string): Promise<BoksLog[]> {
    if (!deviceId) return [];
    try {
      return await db.logs.where('device_id').equals(deviceId).toArray();
    } catch (error) {
      console.error(`Failed to load logs for device ${deviceId}:`, error);
      return [];
    }
  }

  /**
   * Update a code's status
   */
  static async updateCodeStatus(deviceId: string, id: string, status: CodeStatus): Promise<void> {
    try {
      await db.codes.update(id, {
        status: status,
      });
    } catch (error) {
      console.error(`Failed to update code status for device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Remove a code completely
   */
  static async removeCode(deviceId: string, id: string): Promise<void> {
    try {
      await db.codes.delete(id);
    } catch (error) {
      console.error(`Failed to remove code for device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Clear all data for a specific Boks device
   */
  static async clearDeviceData(deviceId: string): Promise<void> {
    if (!deviceId) return;
    try {
      await db.codes.where('device_id').equals(deviceId).delete();
      await db.logs.where('device_id').equals(deviceId).delete();
    } catch (error) {
      console.error(`Failed to clear data for device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Clear entire database (Developer Mode)
   */
  static async clearAllData(): Promise<void> {
    try {
      await db.delete();
      console.log('Database deleted successfully.');
      window.location.reload();
    } catch (error) {
      console.error('Failed to clear database:', error);
      throw error;
    }
  }

  /**
   * Save a setting (upsert)
   */
  static async saveSetting<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void> {
    try {
      // Strictly flat object storage
      await db.settings.put({
        key: key as string,
        value: value as string | number | boolean | object | null,
      });
    } catch (error) {
      console.error(`Failed to save setting ${key as string}:`, error);
      throw error;
    }
  }

  /**
   * Get a setting
   */
  static async getSetting<K extends keyof Settings>(key: K): Promise<Settings[K] | undefined> {
    try {
      const entry = await db.settings.get(key as string);
      return entry ? (entry.value as Settings[K]) : undefined;
    } catch (error) {
      console.error(`Failed to get setting ${key as string}:`, error);
      return undefined;
    }
  }

  /**
   * Mock data for development/testing
   */
  static async mockData(mockDeviceId: string = 'mock-boks-id'): Promise<void> {
    try {
      const boksUuid = mockDeviceId;
      const localUserId = crypto.randomUUID();

      // Clear existing data for this mock device
      await StorageService.clearDeviceData(boksUuid);
      await db.devices.delete(boksUuid);
      await db.device_secrets.delete(boksUuid);
      await db.users.delete(localUserId); // Clear mock user if exists

      // Create a mock user (local for now)
      await db.users.put({
        id: localUserId,
        email: 'local@example.com',
      });

      // Create a mock device
      const mockDevice: BoksDevice = {
        id: boksUuid,
        ble_name: 'Boks_MOCK_BLE',
        friendly_name: 'Ma Boks de Test',
        role: UserRole.Admin,
        sync_status: 'synced',
        last_connected_at: Date.now(),
        hardware_version: '4.0',
        software_revision: '4.4.0',
        la_poste_activated: true,
      };
      await db.devices.put(mockDevice);

      // Create mock secrets
      await db.device_secrets.put({
        device_id: boksUuid,
        configuration_key: 'AABBCCDD',
      });

      // Create mock codes
      const mockCodes: Partial<BoksCode>[] = [
        {
          id: crypto.randomUUID(),
          device_id: boksUuid,
          author_id: localUserId,
          code: '123456',
          type: CODE_TYPES.MASTER,
          status: 'on_device',
          name: 'Code Maître Principal',
          index: 0,
          created_at: new Date().toISOString(),
          sync_status: 'synced',
        },
        {
          id: crypto.randomUUID(),
          device_id: boksUuid,
          author_id: localUserId,
          code: '987654',
          type: CODE_TYPES.SINGLE,
          status: 'on_device',
          name: 'Code Livreur (Utilisé)',
          created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          sync_status: 'synced',
        },
        {
          id: crypto.randomUUID(),
          device_id: boksUuid,
          author_id: localUserId,
          code: '111111',
          type: CODE_TYPES.MULTI,
          status: 'pending_add', // Waiting to be added
          name: 'Code Famille',
          created_at: new Date().toISOString(),
          sync_status: 'created',
        },
        {
          id: crypto.randomUUID(),
          device_id: boksUuid,
          author_id: crypto.randomUUID(), // Another user asked
          code: '333333',
          type: CODE_TYPES.SINGLE,
          status: 'pending_add', // Changed from pending_approval to pending_add
          name: 'Demande Ami',
          created_at: new Date().toISOString(),
          sync_status: 'created',
        },
      ];
      await StorageService.saveCodes(boksUuid, mockCodes);

      // Create mock logs
      const mockLogs: Partial<BoksLog>[] = [
        {
          id: crypto.randomUUID(),
          device_id: boksUuid,
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
          event: 'CODE_BLE_VALID',
          type: 'info',
          data: { code_index: 0, code_value: '123456' },
          opcode: BLEOpcode.LOG_CODE_BLE_VALID_HISTORY,
          payload: new Uint8Array([0x01, 0x31, 0x32, 0x33, 0x34, 0x35, 0x36]),
          synced: false,
        },
        {
          id: crypto.randomUUID(),
          device_id: boksUuid,
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(), // 12 hours ago
          event: 'DOOR_OPENED',
          type: 'info',
          data: {},
          opcode: BLEOpcode.LOG_DOOR_OPEN_HISTORY,
          payload: new Uint8Array([0x01]),
          synced: false,
        },
      ];
      await StorageService.saveLogs(boksUuid, mockLogs);

      // Set this device as the active device
      await StorageService.saveSetting('lastActiveDeviceId', boksUuid);
      console.log(`Mock data saved for boks ${boksUuid} and set as active.`);
    } catch (error) {
      console.error(`Failed to save mock data:`, error);
      throw error;
    }
  }
}

if (typeof window !== 'undefined') {
  window.boksDebug = window.boksDebug || {};
  window.boksDebug.StorageService = StorageService;
  window.boksDebug.mockData = StorageService.mockData;
}
