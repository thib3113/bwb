import { useCallback, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { useDevice } from './useDevice';
import { useBLE } from './useBLE';
import { BoksNfcTag, BoksNfcTagType } from '../types/db';
import { NfcScanStatus } from '../types/nfc';
import { BoksClientError } from '@thib3113/boks-sdk';

export const useNfcTags = () => {
  const { activeDevice } = useDevice();
  const { controller } = useBLE();

  const [scanStatus, setScanStatus] = useState<NfcScanStatus>(NfcScanStatus.IDLE);
  const [scannedUid, setScannedUid] = useState<string | null>(null);

  const deviceId = activeDevice?.id;

  const tags = useLiveQuery(
    () => (deviceId ? db.nfc_tags.where('device_id').equals(deviceId).toArray() : []),
    [deviceId]
  );

  // Helper to set credentials
  const ensureCredentials = useCallback(async () => {
    if (!deviceId) throw new Error('No active device');
    const secrets = await db.device_secrets.get(deviceId);
    const configKey = secrets?.configuration_key || activeDevice?.configuration_key;

    if (!configKey) throw new Error('Configuration Key required');

    // Workaround: SDK expects 32-byte Master Key, pad config key
    if (configKey.length === 8) {
        controller.setCredentials('0'.repeat(56) + configKey);
    } else {
        controller.setCredentials(configKey);
    }
  }, [deviceId, activeDevice, controller]);

  // Start Scan
  const startScan = useCallback(async () => {
    try {
      await ensureCredentials();
      setScanStatus(NfcScanStatus.SCANNING);
      setScannedUid(null);

      try {
          const result = await controller.scanNFCTags(10000); // 10s timeout

          setScannedUid(result.tagId);
          setScanStatus(NfcScanStatus.FOUND);

      } catch (err) {
          if (err instanceof BoksClientError) {
              if (err.id === 'TIMEOUT') {
                  setScanStatus(NfcScanStatus.TIMEOUT);
              } else if (err.id === 'ALREADY_EXISTS') {
                  setScanStatus(NfcScanStatus.ERROR_EXISTS);
                  // SDK doesn't expose UID in ALREADY_EXISTS error payload directly in error object context easily accessible here?
                  // Actually BoksClientError context might have it?
                  // For now, leave scannedUid null or update if possible.
              } else {
                  console.error('NFC Scan Error:', err);
                  setScanStatus(NfcScanStatus.ERROR);
              }
          } else {
              console.error('NFC Scan Error:', err);
              setScanStatus(NfcScanStatus.ERROR);
          }
      }
    } catch (e) {
      console.error('Failed to start scan', e);
      setScanStatus(NfcScanStatus.ERROR);
    }
  }, [ensureCredentials, controller]);

  // Register Tag
  const registerTag = useCallback(
    async (name: string) => {
      if (!scannedUid || !deviceId) return;

      try {
        await ensureCredentials();

        // Only register via BLE if it's a new tag (FOUND status)
        // If it was ALREADY_EXISTS (ERROR_EXISTS), we just update DB name without BLE command
        if (scanStatus === NfcScanStatus.FOUND) {
             const success = await controller.registerNfcTag(scannedUid);
             if (!success) {
                 throw new Error('Register failed');
             }
        }

        // Add/Update DB
        const existing = await db.nfc_tags.where({ device_id: deviceId, uid: scannedUid }).first();
        if (existing) {
          await db.nfc_tags.update(existing.id, {
            name,
            updated_at: Date.now()
          });
        } else {
          await db.nfc_tags.add({
            id: crypto.randomUUID(),
            device_id: deviceId,
            uid: scannedUid,
            name,
            type: BoksNfcTagType.USER_BADGE,
            created_at: Date.now(),
            sync_status: 'created'
          });
        }

        setScanStatus(NfcScanStatus.IDLE);
        setScannedUid(null);
      } catch (e) {
        console.error('Failed to register tag', e);
        throw e;
      }
    },
    [scannedUid, deviceId, ensureCredentials, controller, scanStatus]
  );

  const unregisterTag = useCallback(
    async (tag: BoksNfcTag) => {
      if (!deviceId) return;
      try {
        await ensureCredentials();

        await controller.unregisterNfcTag(tag.uid);

        // Remove from DB
        await db.nfc_tags.delete(tag.id);
      } catch (e) {
        console.error('Failed to unregister tag', e);
        throw e;
      }
    },
    [deviceId, ensureCredentials, controller]
  );

  const resetScan = useCallback(() => {
    setScanStatus(NfcScanStatus.IDLE);
    setScannedUid(null);
  }, []);

  return {
    tags,
    scanStatus,
    scannedUid,
    startScan,
    registerTag,
    unregisterTag,
    resetScan
  };
};
