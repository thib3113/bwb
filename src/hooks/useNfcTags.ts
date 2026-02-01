import { useCallback, useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { useDevice } from './useDevice';
import { useBLE } from './useBLE';
import { useBLEEvents } from './useBLEEvents';
import { BLEOpcode } from '../utils/bleConstants';
import { NfcRegisterPacket } from '../ble/packets/NfcRegisterPacket';
import { NfcScanStartPacket } from '../ble/packets/NfcScanStartPacket';
import { NfcUnregisterPacket } from '../ble/packets/NfcUnregisterPacket';
import { NfcScanResultPacket, NfcScanResultStatus } from '../ble/packets/rx/NfcScanResultPacket';
import { BoksNfcTag, BoksNfcTagType } from '../types/db';
import { BLEPacket } from '../utils/packetParser';
import { NfcScanStatus } from '../types/nfc';

export const useNfcTags = () => {
  const { activeDevice } = useDevice();
  const { sendRequest } = useBLE();
  const { addListener, removeListener } = useBLEEvents();

  const [scanStatus, setScanStatus] = useState<NfcScanStatus>(NfcScanStatus.IDLE);
  const [scannedUid, setScannedUid] = useState<string | null>(null);

  const deviceId = activeDevice?.id;

  const tags = useLiveQuery(
    () => (deviceId ? db.nfc_tags.where('device_id').equals(deviceId).toArray() : []),
    [deviceId]
  );

  // Helper to get config key
  const getConfigKey = useCallback(async () => {
    if (!deviceId) throw new Error('No active device');
    const secrets = await db.device_secrets.get(deviceId);
    if (!secrets?.configuration_key) throw new Error('Configuration Key required');
    return secrets.configuration_key;
  }, [deviceId]);

  // Start Scan
  const startScan = useCallback(async () => {
    try {
      const key = await getConfigKey();
      setScanStatus(NfcScanStatus.SCANNING);
      setScannedUid(null);

      // Send 0x17
      await sendRequest(new NfcScanStartPacket(key));
    } catch (e) {
      console.error('Failed to start scan', e);
      setScanStatus(NfcScanStatus.ERROR);
    }
  }, [getConfigKey, sendRequest]);

  // Handle Scan Notifications
  useEffect(() => {
    const handleScanResult = (packet: BLEPacket) => {
      // Check if it's one of the NFC opcodes
      if (
        [
          BLEOpcode.NOTIFY_NFC_TAG_REGISTER_SCAN_RESULT,
          BLEOpcode.NOTIFY_NFC_TAG_REGISTER_SCAN_ERROR_EXISTS,
          BLEOpcode.NOTIFY_NFC_TAG_REGISTER_SCAN_TIMEOUT,
        ].includes(packet.opcode)
      ) {
        // Use the Packet Class to parse cleanly
        const nfcPacket = new NfcScanResultPacket(packet.opcode);
        nfcPacket.parse(packet.payload);

        switch (nfcPacket.status) {
            case NfcScanResultStatus.TIMEOUT:
                setScanStatus(NfcScanStatus.TIMEOUT);
                break;
            case NfcScanResultStatus.ALREADY_EXISTS:
                setScanStatus(NfcScanStatus.ERROR_EXISTS);
                if (nfcPacket.uid) setScannedUid(nfcPacket.uid);
                break;
            case NfcScanResultStatus.FOUND:
                setScanStatus(NfcScanStatus.FOUND);
                if (nfcPacket.uid) setScannedUid(nfcPacket.uid);
                break;
            default:
                setScanStatus(NfcScanStatus.ERROR);
        }
      }
    };

    // Listen to all relevant opcodes
    addListener(BLEOpcode.NOTIFY_NFC_TAG_REGISTER_SCAN_RESULT, handleScanResult);
    addListener(BLEOpcode.NOTIFY_NFC_TAG_REGISTER_SCAN_ERROR_EXISTS, handleScanResult);
    addListener(BLEOpcode.NOTIFY_NFC_TAG_REGISTER_SCAN_TIMEOUT, handleScanResult);

    return () => {
      removeListener(BLEOpcode.NOTIFY_NFC_TAG_REGISTER_SCAN_RESULT, handleScanResult);
      removeListener(BLEOpcode.NOTIFY_NFC_TAG_REGISTER_SCAN_ERROR_EXISTS, handleScanResult);
      removeListener(BLEOpcode.NOTIFY_NFC_TAG_REGISTER_SCAN_TIMEOUT, handleScanResult);
    };
  }, [addListener, removeListener]);

  // Register Tag
  const registerTag = useCallback(
    async (name: string) => {
      if (!scannedUid || !deviceId) return;

      try {
        const key = await getConfigKey();

        // Convert UID string back to bytes
        const uidBytes = new Uint8Array(
          scannedUid.split(':').map((s) => parseInt(s, 16))
        );

        // Send 0x18
        const packet = new NfcRegisterPacket(key, uidBytes);
        await sendRequest(packet);

        // Add to DB
        // Check if exists
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
                type: BoksNfcTagType.USER_BADGE, // Default to User Badge for manual add
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
    [scannedUid, deviceId, getConfigKey, sendRequest]
  );

  const unregisterTag = useCallback(
    async (tag: BoksNfcTag) => {
        if (!deviceId) return;
        try {
            const key = await getConfigKey();
            const uidBytes = new Uint8Array(
                tag.uid.split(':').map((s) => parseInt(s, 16))
            );

            // Send 0x19
            const packet = new NfcUnregisterPacket(key, uidBytes);
            await sendRequest(packet);

            // Remove from DB
            await db.nfc_tags.delete(tag.id);
        } catch(e) {
            console.error("Failed to unregister tag", e);
            throw e;
        }
    },
    [deviceId, getConfigKey, sendRequest]
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
