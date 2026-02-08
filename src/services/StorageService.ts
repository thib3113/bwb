import { db } from '../db/db';
import { BoksLog, BoksCode, CodeStatus, Settings, BoksSettings, UserRole } from '../types';
import { BoksDevice, BoksNfcTag } from '../types/db';
import { BLEOpcode } from '../utils/bleConstants';
import { CODE_TYPES } from '../utils/constants';

interface RunTaskOptions {
  showNotification?: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  hideNotification?: () => void;
  loadingMsg?: string;
  successMsg?: string;
  errorMsg?: string;
  minDuration?: number;
}

export class StorageService {
  /**
   * Save or update codes in the database
   */
  static async saveCodes(deviceId: string, codes: Partial<BoksCode>[]): Promise<void> {
    if (!deviceId) return;
    try {
      const existingCodes = await db.codes.where('device_id').equals(deviceId).toArray();
      const codesToPut: BoksCode[] = [];

      for (const code of codes) {
        // Find existing code to preserve properties not in 'code' object
        // Match by ID if available, otherwise by code string
        let existing = existingCodes.find((c) => c.id === code.id);
        if (!existing && code.code) {
          existing = existingCodes.find((c) => c.code === code.code);
        }

        const newCode: BoksCode = {
          id: existing?.id || crypto.randomUUID(),
          device_id: deviceId,
          author_id: existing?.author_id || code.author_id || 'unknown',
          type: (code.type || existing?.type || 'single') as any, // Cast for safety
          code: code.code || existing?.code || '',
          name: code.name || existing?.name || '',
          index: code.index !== undefined ? code.index : existing?.index,
          status: code.status || existing?.status || 'pending_add',
          created_at: existing?.created_at || new Date().toISOString(),
          sync_status: code.sync_status || 'created',
          // Merge other props
          ...code,
        } as BoksCode;
        codesToPut.push(newCode);
      }

      if (codesToPut.length > 0) {
        await db.codes.bulkPut(codesToPut);
      }
    } catch (error) {
      console.error(`Failed to save codes for device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Get all codes for a device
   */
  static async loadCodes(deviceId: string): Promise<BoksCode[]> {
    if (!deviceId) return [];
    try {
      return await db.codes.where('device_id').equals(deviceId).toArray();
    } catch (error) {
      console.error(`Failed to load codes for device ${deviceId}:`, error);
      return [];
    }
  }

  /**
   * Save logs and update related entities (Codes, NFC Tags)
   * Accepts Partial<BoksLog> to be compatible with mock data and various inputs
   */
  static async saveLogs(deviceId: string, logs: Partial<BoksLog>[]): Promise<void> {
    if (!deviceId || !logs || logs.length === 0) return;

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

        // Check for Code Usage (Auto-Mark as Used)
        // 0x86 (LOG_CODE_BLE_VALID) and 0x87 (LOG_CODE_KEY_VALID)
        if (
          log.opcode === BLEOpcode.LOG_CODE_BLE_VALID ||
          log.opcode === BLEOpcode.LOG_CODE_KEY_VALID
        ) {
          let usedCodeValue: string | undefined;

          // Try to get code from details (if parsed)
          // @ts-expect-error - 'details' is dynamic
          if (log.details?.code) {
            // @ts-expect-error
            usedCodeValue = log.details.code;
          }
          // Try to get from data (legacy/mock)
          else if (log.data?.code_value) {
            usedCodeValue = log.data.code_value as string;
          }

          if (usedCodeValue) {
            console.log(`[StorageService] Detected usage of code: ${usedCodeValue}`);

            // Find matching code in DB
            // We need to find the OLDEST code that is 'on_device' (or 'synced') and NOT yet marked as used.
            const matchingCodes = await db.codes
              .where('device_id')
              .equals(deviceId)
              .filter((c) => {
                return (
                  c.code === usedCodeValue &&
                  (c.status === 'on_device' || c.status === 'synced') &&
                  !c.usedAt
                );
              })
              .sortBy('created_at'); // Returns Promise<Array> sorted

            if (matchingCodes.length > 0) {
              const codeToUpdate = matchingCodes[0];
              console.log(
                `[StorageService] Marking code ${codeToUpdate.id} (${codeToUpdate.name}) as used.`
              );

              await db.codes.update(codeToUpdate.id, {
                usedAt: logEntry.timestamp as string,
                // We DO NOT change status to 'used', we keep it 'on_device' so it doesn't disappear from the device view unexpectedly
                // UI will handle the 'used' appearance based on usedAt
              });
            }
          }
        }

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

      // Upsert Tags (Optimized: Fetch all potentially relevant tags in bulk)
      if (tagsToUpdate.length > 0) {
        const uniqueUids = Array.from(new Set(tagsToUpdate.map((t) => t.uid)));
        const existingTags = await db.nfc_tags
          .where('device_id')
          .equals(deviceId)
          .and((tag) => uniqueUids.includes(tag.uid))
          .toArray();

        const tagsToPut: BoksNfcTag[] = [];

        for (const tag of tagsToUpdate) {
          const existing = existingTags.find((t) => t.uid === tag.uid);
          if (existing) {
            tagsToPut.push({
              ...existing,
              last_seen_at: tag.last_seen_at,
              type: tag.type,
            });
          } else {
            tagsToPut.push(tag);
          }
        }

        if (tagsToPut.length > 0) {
          // Use bulkPut to update existing or add new ones in one go
          await db.nfc_tags.bulkPut(tagsToPut);
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
   * Utility to run an async task with notification handling
   */
  static async runTask<T>(task: () => Promise<T>, options: RunTaskOptions = {}): Promise<T | null> {
    const {
      showNotification,
      hideNotification,
      loadingMsg,
      successMsg,
      errorMsg,
      minDuration = 500,
    } = options;

    if (showNotification && loadingMsg) {
      showNotification(loadingMsg, 'info');
    }

    const startTime = Date.now();

    try {
      const result = await task();

      const duration = Date.now() - startTime;
      if (duration < minDuration) {
        await new Promise((resolve) => setTimeout(resolve, minDuration - duration));
      }

      if (hideNotification) hideNotification();
      if (showNotification && successMsg) {
        showNotification(successMsg, 'success');
      }

      return result;
    } catch (error) {
      console.error('Task failed:', error);
      if (hideNotification) hideNotification();
      if (showNotification) {
        showNotification(errorMsg || `Error: ${error instanceof Error ? error.message : String(error)}`, 'error');
      }
      return null;
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
        is_offline: true,
        updated_at: Date.now(),
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
          opcode: BLEOpcode.LOG_CODE_BLE_VALID,
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
          opcode: BLEOpcode.LOG_DOOR_OPEN,
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
