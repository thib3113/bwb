import { useCallback, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { useDevice } from './useDevice';
import { useBLE } from './useBLE';
import { BoksNfcTag, BoksNfcTagType } from '../types/db';
import { NfcScanStatus } from '../types/nfc';

export const useNfcTags = () => {
  const { activeDevice } = useDevice();
  const { controller, isConnected } = useBLE();

  const [scanStatus, setScanStatus] = useState<NfcScanStatus>(NfcScanStatus.IDLE);
  const [scannedUid, setScannedUid] = useState<string | null>(null);

  const deviceId = activeDevice?.id;

  const tags = useLiveQuery(
    () => (deviceId ? db.nfc_tags.where('device_id').equals(deviceId).toArray() : []),
    [deviceId]
  );

  // Helper to ensure config key is set on controller
  const ensureCredentials = useCallback(async () => {
    if (!deviceId || !controller) throw new Error('No active device or controller');
    const secrets = await db.device_secrets.get(deviceId);
    if (!secrets?.configuration_key) throw new Error('Configuration Key required');
    try {
      controller.setCredentials(secrets.configuration_key);
    } catch (_e) {
      // ignore if already set
    }
    return secrets.configuration_key;
  }, [deviceId, controller]);

  // Start Scan
  const startScan = useCallback(async () => {
    if (!controller || !isConnected) return;

    try {
      await ensureCredentials();

      setScanStatus(NfcScanStatus.SCANNING);
      setScannedUid(null);

      // Call SDK Scan
      // This promise resolves when a tag is found OR rejects on timeout/error
      const result = await controller.scanNFCTags(10000); // 10s timeout

      setScannedUid(result.tagId);

      // Check if it already exists in our DB?
      // SDK might throw if it exists on device.
      // If we are here, it was found.
      setScanStatus(NfcScanStatus.FOUND);
    } catch (e: any) {
      console.error('Scan failed', e);
      const msg = e.message || String(e);
      if (msg.includes('Timeout') || msg.includes('timeout')) {
        setScanStatus(NfcScanStatus.TIMEOUT);
      } else if (msg.includes('exists') || msg.includes('already')) {
        setScanStatus(NfcScanStatus.ERROR_EXISTS);
        // Try to extract UID from error message if possible?
        // SDK error might not contain UID.
      } else {
        setScanStatus(NfcScanStatus.ERROR);
      }
    }
  }, [controller, isConnected, ensureCredentials]);

  // Register Tag
  const registerTag = useCallback(
    async (name: string) => {
      if (!scannedUid || !deviceId || !controller) return;

      try {
        await ensureCredentials();

        // Register on Device
        // Only if it wasn't already registered.
        // If scanStatus is FOUND, it means it's new (mostly).
        // If SDK scanNFCTags throws on existing, we are good.

        await controller.registerNfcTag(scannedUid);

        // Add to DB
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
      } catch (_e) {
        console.error('Failed to register tag', e);
        throw e;
      }
    },
    [scannedUid, deviceId, controller, ensureCredentials]
  );

  const unregisterTag = useCallback(
    async (tag: BoksNfcTag) => {
      if (!deviceId || !controller) return;
      try {
        await ensureCredentials();

        await controller.unregisterNfcTag(tag.uid);

        // Remove from DB
        await db.nfc_tags.delete(tag.id);
      } catch (_e) {
        console.error('Failed to unregister tag', e);
        throw e;
      }
    },
    [deviceId, controller, ensureCredentials]
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
