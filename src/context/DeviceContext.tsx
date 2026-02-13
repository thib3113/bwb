import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { StorageService } from '../services/StorageService';
import { BluetoothDevice, BoksDevice, UserRole } from '../types';
import { DeviceSecrets } from '../types/db';
import { DeviceContext } from './Contexts';
import { BLEServiceEvent, BoksBLEService } from '../services/BoksBLEService';
import {
  BATTERY_LEVEL_CHAR_UUID,
  BATTERY_SERVICE_UUID,
  BLEOpcode,
  DEVICE_INFO_CHARS,
  DEVICE_INFO_SERVICE_UUID,
  SIMULATOR_BLE_ID,
  SIMULATOR_DEFAULT_CONFIG_KEY,
  SIMULATOR_DEFAULT_PIN
} from '../utils/bleConstants';
import { BLEPacket } from '../utils/packetParser';
import { CountCodesPacket } from '../ble/packets/StatusPackets';
import { SetConfigurationPacket } from '../ble/packets/SetConfigurationPacket';
import { PCB_VERSIONS, checkDeviceVersion } from '../utils/version';

// Ensure StorageService is exposed for debugging
if (typeof window !== 'undefined') {
  window.boksDebug = window.boksDebug || {};
  window.boksDebug.StorageService = StorageService;
}

export const DeviceProvider = ({ children }: { children: ReactNode }) => {
  const devicesQuery = useLiveQuery(() => db.devices.toArray(), [], []) as BoksDevice[] | undefined;
  const secretsQuery = useLiveQuery(() => db.device_secrets.toArray(), [], []) as
    | DeviceSecrets[]
    | undefined;

  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null);
  const activeDeviceIdRef = useRef(activeDeviceId);

  // New state for syncing codes
  const [isSyncingCodes, setIsSyncingCodes] = useState(false);

  // Fusionner les appareils et les secrets pour la compatibilité avec le reste de l'app
  const knownDevices = useMemo(() => {
    if (!devicesQuery) return [];
    return devicesQuery.map((device) => ({
      ...device,
      ...(secretsQuery?.find((s) => s.device_id === device.id) || {})
    })) as (BoksDevice & Partial<DeviceSecrets>)[];
  }, [devicesQuery, secretsQuery]);

  useEffect(() => {
    activeDeviceIdRef.current = activeDeviceId;
  }, [activeDeviceId]);

  // Global listener for counts and battery level
  useEffect(() => {
    const bleService = BoksBLEService.getInstance();

    const handlePacket = async (data: unknown, opcode: unknown) => {
      const packet = data as BLEPacket;
      const requestOpcode = opcode as number | undefined;
      const currentId = activeDeviceIdRef.current;
      if (!currentId) return;

      if (packet.opcode === BLEOpcode.NOTIFY_CODES_COUNT) {
        // Reset syncing state when we receive the count
        setIsSyncingCodes(false);

        if (packet.payload.length >= 4) {
          const master = (packet.payload[0] << 8) | packet.payload[1];
          const single = (packet.payload[2] << 8) | packet.payload[3];

          console.log(
            `[DeviceContext] 0xC3 received. Payload length: ${packet.payload.length}. Master=${master}, Single=${single}, Full:`,
            Array.from(packet.payload)
          );

          await db.devices.update(currentId, {
            master_code_count: master,
            single_code_count: single
          });

          const updated = await db.devices.get(currentId);
          console.log(`[DeviceContext] Device state after C3 update:`, updated);
        }
      } else if (packet.opcode === BLEOpcode.NOTIFY_LOGS_COUNT) {
        if (packet.payload.length >= 2) {
          const val16 = (packet.payload[0] << 8) | packet.payload[1];
          console.log(
            `[DeviceContext] 0x79 received (Req: 0x${requestOpcode?.toString(16)}). Logs: ${val16}`
          );
          // Removed: Don't store log_count in DB as per user request
        }
      }
    };

    const unsub = bleService.on(BLEServiceEvent.PACKET_RECEIVED, handlePacket);
    return () => unsub();
  }, []);

  // Global listener for battery level
  useEffect(() => {
    const bleService = BoksBLEService.getInstance();

    const handleBatteryPacket = async (data: unknown, opcode: unknown) => {
      const packet = data as BLEPacket;
      const requestOpcode = opcode as number | undefined;
      const currentId = activeDeviceIdRef.current;
      if (!currentId) return;

      // Check if this is a battery level packet (proprietary format)
      if (requestOpcode === BLEOpcode.TEST_BATTERY && packet.payload.length >= 1) {
        // Use the first byte as battery level (0-100%)
        const batteryLevel = packet.payload[0];
        console.log(`[DeviceContext] Battery level received: ${batteryLevel}%`);

        // Update device with battery level
        await db.devices.update(currentId, {
          battery_level: batteryLevel
        });
      }
    };

    const unsub = bleService.on(BLEServiceEvent.PACKET_RECEIVED, handleBatteryPacket);
    return () => unsub();
  }, []);

  // Load active device from settings on init
  useEffect(() => {
    const loadActiveDevice = async () => {
      try {
        const value = await StorageService.getSetting('lastActiveDeviceId');
        if (value) {
          setActiveDeviceId(value as string);
        }
      } catch (e) {
        console.error('Failed to load active device from db', e);
      }
    };

    loadActiveDevice();
  }, []);

  // Save active device ID to db whenever it changes
  useEffect(() => {
    if (activeDeviceId) {
      StorageService.saveSetting('lastActiveDeviceId', activeDeviceId).catch((error) => {
        console.error('Failed to save active device ID:', error);
      });
    }
  }, [activeDeviceId]);

  // Function to set active device
  const setActiveDevice = useCallback((deviceId: string | null) => {
    setActiveDeviceId(deviceId);
  }, []);

  // Function to update device battery level
  const updateDeviceBatteryLevel = useCallback(async (deviceId: string, batteryLevel: number) => {
    try {
      const deviceToUpdate = await db.devices.get(deviceId);
      if (deviceToUpdate) {
        await db.devices.update(deviceId, {
          battery_level: batteryLevel
        });
      }
    } catch (error) {
      console.error('Failed to update device battery level:', error);
      throw error;
    }
  }, []);

  // Function to register a device (called upon successful BLE connection)
  const registerDevice = useCallback(
    async (bleDevice: BluetoothDevice) => {
      const bleName = bleDevice.name;

      if (!bleName) {
        throw new Error('Device name is required for registration');
      }

      const friendlyName = bleDevice.name || `Boks ${bleName.substring(0, 8)}`;

      try {
        // Find existing device by unique BLE Identifier (ble_name)
        const existingDevice = await db.devices.where('ble_name').equals(bleName).first();
        // No manual updated_at, handled by hook

        let targetId: string;
        let isNewDevice = false;

        if (existingDevice) {
          targetId = existingDevice.id;
          // Update last seen timestamp
          await db.devices.update(existingDevice.id, {
            last_connected_at: Date.now()
          });
        } else {
          isNewDevice = true;
          // Add new device
          targetId = crypto.randomUUID();

          // Special handling for Simulator
          const isSimulator = bleName === SIMULATOR_BLE_ID;
          const initialFriendlyName = isSimulator ? 'Boks Simulator' : friendlyName;
          const initialPin = isSimulator ? SIMULATOR_DEFAULT_PIN : undefined;

          await db.devices.add({
            id: targetId,
            ble_name: bleName,
            friendly_name: initialFriendlyName,
            door_pin_code: initialPin,
            role: UserRole.Admin, // Default role for locally discovered devices
            sync_status: 'created',
            last_connected_at: Date.now(),
            la_poste_activated: false,
            auto_sync: true
          });

          // Initialize secrets (auto-fill for simulator)
          await db.device_secrets.add({
            device_id: targetId,
            configuration_key: isSimulator ? SIMULATOR_DEFAULT_CONFIG_KEY : undefined
          });
        }

        // Set as active device
        setActiveDeviceId(targetId);

        // Helper for info reading
        const readInfo = async () => {
          try {
            const bleService = BoksBLEService.getInstance();
            if (bleService.getState() === 'connected') {
              // 1. Battery
              try {
                const val = await bleService.readCharacteristic(
                  BATTERY_SERVICE_UUID,
                  BATTERY_LEVEL_CHAR_UUID
                );
                const level = val.getUint8(0);
                console.log(`[DeviceContext] Standard Battery Level read: ${level}%`);
                await updateDeviceBatteryLevel(targetId, level);
              } catch (e) {
                console.warn('[DeviceContext] Failed to read battery:', e);
              }

              // 2. Firmware & Software Revision
              const updates: Partial<BoksDevice> = {};
              const decoder = new TextDecoder();

              try {
                const fwData = await bleService.readCharacteristic(
                  DEVICE_INFO_SERVICE_UUID,
                  DEVICE_INFO_CHARS['Firmware Revision']
                );
                const fwRev = decoder.decode(fwData).replace(/\0/g, '').trim();
                console.log(`[DeviceContext] Firmware Revision: ${fwRev}`);
                updates.firmware_revision = fwRev;

                // Map to Hardware Version
                if (PCB_VERSIONS[fwRev]) {
                  updates.hardware_version = PCB_VERSIONS[fwRev];
                  console.log(
                    `[DeviceContext] Mapped HW Version: ${updates.hardware_version} from FW ${fwRev}`
                  );
                }
              } catch (e) {
                console.warn('[DeviceContext] Failed to read FW Revision:', e);
              }

              try {
                const swData = await bleService.readCharacteristic(
                  DEVICE_INFO_SERVICE_UUID,
                  DEVICE_INFO_CHARS['Software Revision']
                );
                const swRev = decoder.decode(swData).replace(/\0/g, '').trim();
                console.log(`[DeviceContext] Software Revision: ${swRev}`);
                updates.software_revision = swRev;
              } catch (e) {
                console.warn('[DeviceContext] Failed to read SW Revision:', e);
              }

              if (Object.keys(updates).length > 0) {
                await db.devices.update(targetId, updates);
              }
            }
          } catch (error) {
            console.warn('Failed to read device info:', error);
          }
        };

        // Read once immediately
        readInfo();

        // And again after 2s for stability
        setTimeout(readInfo, 2000);

        return isNewDevice;
      } catch (error) {
        console.error('Failed to register device:', error);
        throw error;
      }
    },
    [updateDeviceBatteryLevel]
  );

  // Auto-register device on connection
  useEffect(() => {
    const bleService = BoksBLEService.getInstance();

    const handleConnected = () => {
      const device = bleService.getDevice();
      if (device && device.id) {
        console.log(
          '[DeviceContext] Connected event received. Auto-registering device:',
          device.id
        );
        registerDevice(device).catch((err) => {
          console.error('[DeviceContext] Failed to auto-register device:', err);
        });
      }
    };

    // Check initial state
    if (bleService.getState() === 'connected') {
      handleConnected();
    }

    const unsub = bleService.on(BLEServiceEvent.CONNECTED, handleConnected);
    return () => unsub();
  }, [registerDevice]);

  // Function to update device name/alias
  const updateDeviceName = useCallback(async (deviceId: string, newName: string) => {
    try {
      // In V2, deviceId is the UUID primary key
      const deviceToUpdate = await db.devices.get(deviceId);
      if (deviceToUpdate) {
        await db.devices.update(deviceId, {
          friendly_name: newName,
          sync_status: 'updated' // Mark for sync
        });
      }
    } catch (error) {
      console.error('Failed to update device name:', error);
      throw error;
    }
  }, []);

  // Function to update device sensitive details
  const updateDeviceDetails = useCallback(
    async (deviceId: string, details: Partial<BoksDevice> & Partial<DeviceSecrets>) => {
      try {
        const deviceToUpdate = await db.devices.get(deviceId);
        if (deviceToUpdate) {
          // Separate public details and secrets
          const { configuration_key, door_pin_code, ...publicDetails } = details;

          if (Object.keys(publicDetails).length > 0) {
            await db.devices.update(deviceId, {
              ...publicDetails,
              sync_status: 'updated'
            });
          }

          // Update door_pin_code in devices table
          if (door_pin_code !== undefined) {
            await db.devices.update(deviceId, {
              door_pin_code: door_pin_code,
              sync_status: 'updated'
            });
          }

          // Update configuration_key in device_secrets table
          if (configuration_key !== undefined) {
            const secretUpdate: Partial<DeviceSecrets> = {
              configuration_key: configuration_key
            };

            const existingSecret = await db.device_secrets.get(deviceId);
            if (existingSecret) {
              await db.device_secrets.update(deviceId, secretUpdate);
            } else {
              await db.device_secrets.add({
                device_id: deviceId,
                ...secretUpdate
              });
            }
          }
        }
      } catch (error) {
        console.error('Failed to update device details:', error);
        throw error;
      }
    },
    []
  );

  // Function to remove a device
  const removeDevice = useCallback(
    async (deviceId: string) => {
      try {
        // Delete device
        await db.devices.delete(deviceId);
        // Delete secrets (cascade in logic)
        await db.device_secrets.delete(deviceId);

        // If we're removing the active device, clear active device
        if (activeDeviceId === deviceId) {
          setActiveDeviceId(null);
        }

        // Clear device data from storage (Codes, Logs)
        await StorageService.clearDeviceData(deviceId);
      } catch (error) {
        console.error('Failed to remove device:', error);
        throw error;
      }
    },
    [activeDeviceId]
  );

  // Get active device object
  const activeDevice = useMemo(
    () => knownDevices.find((d) => d.id === activeDeviceId) || null,
    [knownDevices, activeDeviceId]
  );

  const codeCount = useMemo(() => {
    if (!activeDevice) return null;
    const master = activeDevice.master_code_count ?? 0;
    const single = activeDevice.single_code_count ?? 0;
    return {
      master,
      single,
      total: master + single
    };
  }, [activeDevice]);

  const logCount = useMemo(() => {
    if (!activeDevice) return null;
    return activeDevice.log_count ?? 0;
  }, [activeDevice]);

  // Function to toggle La Poste
  const toggleLaPoste = useCallback(async (enable: boolean) => {
    if (!activeDeviceIdRef.current) return;
    const deviceId = activeDeviceIdRef.current;

    try {
      const secrets = await db.device_secrets.get(deviceId);
      if (!secrets?.configuration_key) throw new Error('Configuration Key required');

      const bleService = BoksBLEService.getInstance();
      const packet = new SetConfigurationPacket(
        secrets.configuration_key,
        0x01, // Type: La Poste
        enable ? 0x01 : 0x00
      );

      await bleService.sendRequest(packet);

      // Update local DB state
      await db.devices.update(deviceId, {
        la_poste_activated: enable
      });
    } catch (error) {
      console.error('Failed to toggle La Poste:', error);
      throw error;
    }
  }, []);

  // Re-define refreshCodeCount properly with check

  const refreshCodeCountWithCheck = useCallback(async () => {
    const bleService = BoksBLEService.getInstance();
    if (bleService.getState() !== 'connected') return;

    // Check version
    const currentId = activeDeviceIdRef.current;
    if (currentId) {
      const device = knownDevices.find((d) => d.id === currentId);
      if (device && checkDeviceVersion(device).isRestricted) {
        console.log('[DeviceContext] Code count refresh aborted due to restricted version.');
        return;
      }
    }

    try {
      setIsSyncingCodes(true);
      await bleService.sendRequest(new CountCodesPacket());

      // Safety timeout: Reset syncing state if no response after 5s
      setTimeout(() => {
        setIsSyncingCodes((prev) => {
          if (prev) {
            console.warn('[DeviceContext] Code sync timed out (no 0xC3 received).');
            return false;
          }
          return prev;
        });
      }, 5000);
    } catch (error) {
      console.error('Failed to refresh code count:', error);
      setIsSyncingCodes(false);
    }
  }, [knownDevices]);
  // knownDevices changes when device updates, so this is fine.

  const value = useMemo(
    () => ({
      knownDevices,
      activeDevice,
      activeDeviceId,
      codeCount,
      logCount,
      registerDevice,
      updateDeviceName,
      updateDeviceDetails,
      removeDevice,
      setActiveDevice,
      refreshCodeCount: refreshCodeCountWithCheck, // Use the new one
      updateDeviceBatteryLevel,
      toggleLaPoste,
      isSyncingCodes // Export new state
    }),
    [
      knownDevices,
      activeDevice,
      activeDeviceId,
      codeCount,
      logCount,
      registerDevice,
      updateDeviceName,
      updateDeviceDetails,
      removeDevice,
      setActiveDevice,
      refreshCodeCountWithCheck,
      updateDeviceBatteryLevel,
      toggleLaPoste,
      isSyncingCodes
    ]
  );

  return <DeviceContext.Provider value={value}>{children}</DeviceContext.Provider>;
};
