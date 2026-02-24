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
import { PCB_VERSIONS, checkDeviceVersion } from '../utils/version';

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

  const [isSyncingCodes, setIsSyncingCodes] = useState(false);

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
        }
      } else if (packet.opcode === BLEOpcode.NOTIFY_LOGS_COUNT) {
        if (packet.payload.length >= 2) {
          const val16 = (packet.payload[0] << 8) | packet.payload[1];
          console.log(
            `[DeviceContext] 0x79 received. Logs: ${val16}`
          );
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
        const batteryLevel = packet.payload[0];
        console.log(`[DeviceContext] Battery level received: ${batteryLevel}%`);

        await db.devices.update(currentId, {
          battery_level: batteryLevel
        });
      }
    };

    const unsub = bleService.on(BLEServiceEvent.PACKET_RECEIVED, handleBatteryPacket);
    return () => unsub();
  }, []);

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

  useEffect(() => {
    if (activeDeviceId) {
      StorageService.saveSetting('lastActiveDeviceId', activeDeviceId).catch((error) => {
        console.error('Failed to save active device ID:', error);
      });
    }
  }, [activeDeviceId]);

  const setActiveDevice = useCallback((deviceId: string | null) => {
    setActiveDeviceId(deviceId);
  }, []);

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

        const readInfo = async () => {
          try {
            const bleService = BoksBLEService.getInstance();
            if (bleService.getState() === 'connected') {
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

        readInfo();
        setTimeout(readInfo, 2000);

        return isNewDevice;
      } catch (error) {
        console.error('Failed to register device:', error);
        throw error;
      }
    },
    [updateDeviceBatteryLevel]
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
          }
        }
      } catch (error) {
        console.error('Failed to update device details:', error);
        throw error;
      }
    },
    []
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

  // Function to toggle La Poste
  const toggleLaPoste = useCallback(async (enable: boolean) => {
    if (!activeDeviceIdRef.current) return;
    const deviceId = activeDeviceIdRef.current;

    try {
      const secrets = await db.device_secrets.get(deviceId);
      if (!secrets?.configuration_key) throw new Error('Configuration Key required');

      const bleService = BoksBLEService.getInstance();

      // Workaround for credentials
      const configKey = secrets.configuration_key;
      if (configKey.length === 8) {
          bleService.controller.setCredentials('0'.repeat(56) + configKey);
      } else {
          bleService.controller.setCredentials(configKey);
      }

      await bleService.controller.setConfiguration({
          type: 0x01, // La Poste
          value: enable
      });

      // Update local DB state
      await db.devices.update(deviceId, {
        la_poste_activated: enable
      });
    } catch (error) {
      console.error('Failed to toggle La Poste:', error);
      throw error;
    }
  }, []);

  const refreshCodeCountWithCheck = useCallback(async () => {
    const bleService = BoksBLEService.getInstance();
    if (bleService.getState() !== 'connected') return;

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
      // Use controller.countCodes(). This emits 0xC3 implicitly.
      await bleService.controller.countCodes();

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
