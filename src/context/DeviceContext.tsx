import { useCallback, useEffect, useMemo, useRef, useState, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { BoksDevice, UserRole } from '../types';
import { DeviceSecrets } from '../types/db';
import { SIMULATOR_BLE_ID, SIMULATOR_DEFAULT_CONFIG_KEY, SIMULATOR_DEFAULT_PIN, BLEOpcode } from '../utils/bleConstants';
import { db } from '../db/db';
import { DeviceContext } from './Contexts';
import { BLEContext } from './Contexts';
import { BluetoothDevice } from '../types';
import { useLiveQuery } from 'dexie-react-hooks';
import { StorageService } from '../services/StorageService';
import { checkDeviceVersion } from '../utils/version';
import { BLEContextType } from './types';

export const DeviceProvider = ({ children }: { children: React.ReactNode }) => {
  const bleContext = useContext(BLEContext);
  const controller = bleContext?.controller;
  const isConnected = bleContext?.isConnected;

  const { t } = useTranslation();

  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null);
  const [isSyncingCodes, setIsSyncingCodes] = useState(false);
  const activeDeviceIdRef = useRef<string | null>(null);

  const devicesQuery = useLiveQuery(() => db.devices.toArray());
  const secretsQuery = useLiveQuery(() => db.device_secrets.toArray());

  const knownDevices = useMemo(() => {
    return (devicesQuery || []).map((device) => ({
      ...device,
      ...(secretsQuery?.find((s) => s.device_id === device.id) || {})
    })) as (BoksDevice & Partial<DeviceSecrets>)[];
  }, [devicesQuery, secretsQuery]);

  useEffect(() => {
    activeDeviceIdRef.current = activeDeviceId;
  }, [activeDeviceId]);

  // Global listener for counts and battery level
  useEffect(() => {
    if (!controller) return;

    const handlePacket = async (packet: any) => {
      const currentId = activeDeviceIdRef.current;
      if (!currentId) return;

      if (packet.opcode === BLEOpcode.NOTIFY_CODES_COUNT) {
        setIsSyncingCodes(false);
        // Safety check for payload existence
        if (packet.payload && packet.payload.length >= 4) {
          const master = (packet.payload[0] << 8) | packet.payload[1];
          const single = (packet.payload[2] << 8) | packet.payload[3];

          console.log(`[DeviceContext] 0xC3 received. Master=${master}, Single=${single}`);

          await db.devices.update(currentId, {
            master_code_count: master,
            single_code_count: single
          });
        }
      }
    };

    const unsub = controller.onPacket(handlePacket);
    return () => unsub();
  }, [controller]);

  // Load active device from settings on mount
  useEffect(() => {
    const loadActiveDevice = async () => {
      try {
        const lastId = await StorageService.getSetting('lastActiveDeviceId');
        if (lastId) {
          const exists = await db.devices.get(lastId);
          if (exists) {
            setActiveDeviceId(lastId);
          }
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
        const existingDevice = await db.devices.where('ble_name').equals(bleName).first();

        let targetId: string;
        let isNewDevice = false;

        if (existingDevice) {
          targetId = existingDevice.id;
          await db.devices.update(existingDevice.id, {
            last_connected_at: Date.now()
          });
        } else {
          isNewDevice = true;
          targetId = crypto.randomUUID();

          const isSimulator = bleName === SIMULATOR_BLE_ID;
          const initialFriendlyName = isSimulator ? 'Boks Simulator' : friendlyName;
          const initialPin = isSimulator ? SIMULATOR_DEFAULT_PIN : undefined;

          await db.devices.add({
            id: targetId,
            ble_name: bleName,
            friendly_name: initialFriendlyName,
            door_pin_code: initialPin,
            role: UserRole.Admin,
            sync_status: 'created',
            last_connected_at: Date.now(),
            la_poste_activated: false,
            auto_sync: true
          });

          await db.device_secrets.add({
            device_id: targetId,
            configuration_key: isSimulator ? SIMULATOR_DEFAULT_CONFIG_KEY : undefined
          });
        }

        setActiveDeviceId(targetId);

        // Retrieve info from controller
        const secrets = await db.device_secrets.get(targetId);
        if (secrets && secrets.configuration_key) {
          try {
            controller?.setCredentials(secrets.configuration_key);
            console.log('[DeviceContext] Credentials set for controller');
          } catch (e) {
            console.warn('[DeviceContext] Failed to set credentials:', e);
          }
        }

        const readInfo = async () => {
          if (!controller) return;

          // 1. Battery
          try {
            const level = await controller.getBatteryLevel();
            if (level !== undefined) {
              await updateDeviceBatteryLevel(targetId, level);
            }
          } catch (e) {
            console.warn('Battery read failed', e);
          }

          // 2. HW Info
          const info = controller.hardwareInfo;
          if (info) {
            const updates: Partial<BoksDevice> = {};
            if (info.firmwareRevision) updates.firmware_revision = info.firmwareRevision;
            if (info.softwareRevision) updates.software_revision = info.softwareRevision;
            if (info.hardwareVersion) updates.hardware_version = info.hardwareVersion;

            if (Object.keys(updates).length > 0) {
              await db.devices.update(targetId, updates);
            }
          }
        };

        readInfo();
        return isNewDevice;
      } catch (error) {
        console.error('Failed to register device:', error);
        throw error;
      }
    },
    [updateDeviceBatteryLevel, controller]
  );

  const updateDeviceName = useCallback(async (deviceId: string, newName: string) => {
    try {
      const deviceToUpdate = await db.devices.get(deviceId);
      if (deviceToUpdate) {
        await db.devices.update(deviceId, {
          friendly_name: newName,
          sync_status: 'updated'
        });
      }
    } catch (error) {
      console.error('Failed to update device name:', error);
      throw error;
    }
  }, []);

  const updateDeviceDetails = useCallback(
    async (deviceId: string, details: Partial<BoksDevice> & Partial<DeviceSecrets>) => {
      try {
        const deviceToUpdate = await db.devices.get(deviceId);
        if (deviceToUpdate) {
          const { configuration_key, door_pin_code, ...publicDetails } = details;

          if (Object.keys(publicDetails).length > 0) {
            await db.devices.update(deviceId, {
              ...publicDetails,
              sync_status: 'updated'
            });
          }

          if (door_pin_code !== undefined) {
            await db.devices.update(deviceId, {
              door_pin_code: door_pin_code,
              sync_status: 'updated'
            });
          }

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

            // Update controller if active
            if (deviceId === activeDeviceIdRef.current && controller) {
              controller?.setCredentials(configuration_key);
            }
          }
        }
      } catch (error) {
        console.error('Failed to update device details:', error);
        throw error;
      }
    },
    [controller]
  );

  const removeDevice = useCallback(
    async (deviceId: string) => {
      try {
        await db.devices.delete(deviceId);
        await db.device_secrets.delete(deviceId);
        if (activeDeviceId === deviceId) {
          setActiveDeviceId(null);
        }
        await StorageService.clearDeviceData(deviceId);
      } catch (error) {
        console.error('Failed to remove device:', error);
        throw error;
      }
    },
    [activeDeviceId]
  );

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

  const toggleLaPoste = useCallback(
    async (enable: boolean) => {
      if (!activeDeviceIdRef.current || !controller) return;
      const deviceId = activeDeviceIdRef.current;

      try {
        // SDK High Level
        await controller.setConfiguration({ type: 0x01, value: enable });

        await db.devices.update(deviceId, {
          la_poste_activated: enable
        });
      } catch (error) {
        console.error('Failed to toggle La Poste:', error);
        throw error;
      }
    },
    [controller]
  );

  const refreshCodeCountWithCheck = useCallback(async () => {
    if (!controller || !isConnected) return;

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
      // SDK High Level
      const counts = await controller.countCodes();

      if (currentId) {
        await db.devices.update(currentId, {
          master_code_count: counts.masterCount,
          single_code_count: counts.singleCount
        });
      }
      setIsSyncingCodes(false);
    } catch (error) {
      console.error('Failed to refresh code count:', error);
      setIsSyncingCodes(false);
    }
  }, [knownDevices, controller, isConnected]);

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
      refreshCodeCount: refreshCodeCountWithCheck,
      updateDeviceBatteryLevel,
      toggleLaPoste,
      isSyncingCodes
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
