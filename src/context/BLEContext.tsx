import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { BLEServiceEvent, BLEServiceState, BoksBLEService } from '../services/BoksBLEService';
import { BLEPacket } from '../utils/packetParser';
import { BLEOpcode, DEVICE_INFO_CHARS, DEVICE_INFO_SERVICE_UUID } from '../utils/bleConstants';
import { BLEContext } from './Contexts';
import { useLogContext } from '../hooks/useLogContext';
import { BluetoothDevice } from '../types';
import { translateBLEError } from '../utils/bleUtils';

import { BoksTXPacket } from '../ble/packets/BoksTXPacket';
import { RawTXPacket } from '../ble/packets/RawTXPacket';

import { SimulatedBluetoothAdapter } from '../ble/adapter/SimulatedBluetoothAdapter';
import { WebBluetoothAdapter } from '../ble/adapter/WebBluetoothAdapter';

export const BLEProvider = ({ children }: { children: ReactNode }) => {
  const { log, addDebugLog } = useLogContext();

  const bleService = useMemo(() => {
    const service = BoksBLEService.getInstance();

    // @ts-expect-error - Custom global flag
    const useSimulator = typeof window !== 'undefined' && window.BOKS_SIMULATOR_ENABLED === true;

    if (useSimulator) {
      console.warn('⚠️ USING BOKS SIMULATOR ADAPTER ⚠️');
      service.setAdapter(new SimulatedBluetoothAdapter());
    } else {
      service.setAdapter(new WebBluetoothAdapter());
    }
    return service;
  }, []);

  const [connectionState, setConnectionState] = useState<BLEServiceState>(bleService.getState());
  const [device, setDevice] = useState<BluetoothDevice | null>(bleService.getDevice());
  const [error, setError] = useState<string | null>(null);

  // Listen to service events
  useEffect(() => {
    const unsubState = bleService.on(BLEServiceEvent.STATE_CHANGED, (state: BLEServiceState) => {
      setConnectionState(state);
      if (state === 'connected') setError(null);
      addDebugLog({
        id: Date.now() + Math.random(),
        timestamp: new Date(),
        raw: `State changed: ${state.toUpperCase()}`,
        type: 'system',
      });
    });

    const unsubConnected = bleService.on(BLEServiceEvent.CONNECTED, (dev: BluetoothDevice) => {
      setDevice(dev);
      log('Connected successfully!', 'info');
      addDebugLog({
        id: Date.now() + Math.random(),
        timestamp: new Date(),
        raw: `Connected to ${dev.name || dev.id}`,
        type: 'system',
      });
    });

    const unsubDisconnected = bleService.on(BLEServiceEvent.DISCONNECTED, () => {
      setDevice(null);
      log('Device disconnected', 'error');
      addDebugLog({
        id: Date.now() + Math.random(),
        timestamp: new Date(),
        raw: `Disconnected`,
        type: 'system',
      });
    });

    const unsubPacketReceived = bleService.on(
      BLEServiceEvent.PACKET_RECEIVED,
      (packet: BLEPacket) => {
        // Log RX packets
        const hex = Array.from(packet.raw)
          .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
          .join(' ');
        log(`RX: ${hex}`, 'rx');

        const hexPayload = Array.from(packet.payload)
          .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
          .join(' ');

        addDebugLog({
          id: Date.now() + Math.random(),
          timestamp: new Date(),
          direction: 'RX',
          opcode: packet.opcode,
          payload: hexPayload,
          raw: hex,
          type: 'packet',
          uuid: packet.uuid,
        });
      }
    );

    const unsubPacketSent = bleService.on(BLEServiceEvent.PACKET_SENT, (packet: BLEPacket) => {
      // Log TX packets
      const hex = Array.from(packet.raw)
        .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
        .join(' ');
      log(`TX: ${hex}`, 'tx');

      const hexPayload = Array.from(packet.payload)
        .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
        .join(' ');

      addDebugLog({
        id: Date.now() + Math.random(),
        timestamp: new Date(),
        direction: 'TX',
        opcode: packet.opcode,
        payload: hexPayload,
        raw: hex,
        type: 'packet',
        uuid: packet.uuid,
      });
    });

    const unsubError = bleService.on(BLEServiceEvent.ERROR, (error: Error | string) => {
      const errorMsg = typeof error === 'string' ? error : error.message;
      setError(translateBLEError(error));
      log(`BLE Error: ${errorMsg}`, 'error');
      addDebugLog({
        id: Date.now() + Math.random(),
        timestamp: new Date(),
        raw: `Error: ${errorMsg}`,
        type: 'error',
      });
    });

    return () => {
      unsubState();
      unsubConnected();
      unsubDisconnected();
      unsubPacketReceived();
      unsubPacketSent();
      unsubError();
    };
  }, [bleService, log, addDebugLog]);

  const isConnected = connectionState === 'connected';
  const isConnecting = connectionState === 'scanning' || connectionState === 'connecting';

  // Exposed methods
  const connect = useCallback(
    async (customServices: string[] = []) => {
      setError(null);
      try {
        await bleService.connect(customServices);
      } catch (e: unknown) {
        setError(translateBLEError(e));
        throw e;
      }
    },
    [bleService]
  );

  const disconnect = useCallback(() => {
    setError(null);
    bleService.disconnect();
  }, [bleService]);
  const sendRequest = useCallback(
    (
      opcode: BLEOpcode,
      payload: Uint8Array,
      options?: { expectResponse?: boolean; timeout?: number }
    ) => bleService.sendRequest(new RawTXPacket(opcode, payload), options),
    [bleService]
  );

  const addListener = useCallback(
    (event: string | number, callback: (packet: BLEPacket) => void) => {
      const eventKey = typeof event === 'number' ? `opcode_${event}` : event;
      // Map '*' to PACKET_RECEIVED
      const actualEvent = eventKey === '*' ? BLEServiceEvent.PACKET_RECEIVED : eventKey;
      return bleService.on(actualEvent, callback);
    },
    [bleService]
  );

  const removeListener = useCallback(
    (event: string | number, callback: (packet: BLEPacket) => void) => {
      const eventKey = typeof event === 'number' ? `opcode_${event}` : event;
      const actualEvent = eventKey === '*' ? BLEServiceEvent.PACKET_RECEIVED : eventKey;
      bleService.off(actualEvent, callback);
    },
    [bleService]
  );

  // Stabilize getAllDeviceInfo
  const getAllDeviceInfo = useCallback(async () => {
    if (connectionState !== 'connected') return {};
    const info: Record<string, string> = {};

    console.log('[BLEContext] Fetching all device info...');
    for (const [name, uuid] of Object.entries(DEVICE_INFO_CHARS)) {
      try {
        const readPromise = bleService.readCharacteristic(DEVICE_INFO_SERVICE_UUID, uuid);
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Read timeout')), 1500)
        );

        const data = (await Promise.race([readPromise, timeoutPromise])) as DataView;
        const decoder = new TextDecoder();
        info[name] = decoder.decode(data).replace(/\0/g, '').trim();
        console.log(`[BLEContext] Read ${name}: ${info[name]}`);
      } catch (e) {
        console.warn(`[BLEContext] Failed to read device info: ${name}`, e);
      }
    }
    return info;
  }, [connectionState, bleService]);

  const value = useMemo(
    () => ({
      device,
      connectionState,
      isConnected,
      isConnecting,
      error,
      connect,
      disconnect,
      sendPacket: async (packet: BoksTXPacket | Uint8Array) => {
        if (packet instanceof Uint8Array) {
          // Legacy support: extract opcode and payload from raw frame [Op, Len, ...P, Checksum]
          const opcode = packet[0];
          const payload = packet.slice(2, packet.length - 1);
          await bleService.sendRequest(
            { opcode, payload },
            {
              expectResponse: false,
            }
          );
        } else {
          // New architecture: Pass the packet object directly
          await bleService.sendRequest(packet, {
            expectResponse: false,
          });
        }
      },
      sendRequest,
      getDeviceInfo: async () => null, // To be implemented if needed
      getAllDeviceInfo,
      getBatteryInfo: async () => {
        if (connectionState !== 'connected') return null;
        try {
          return await bleService.readCharacteristic(BATTERY_SERVICE_UUID, BATTERY_LEVEL_CHAR_UUID);
        } catch (e) {
          console.warn('Failed to read standard battery level:', e);
          return null;
        }
      },
      readCharacteristic: async (serviceUuid: string, charUuid: string) => {
        return await bleService.readCharacteristic(serviceUuid, charUuid);
      },
      registerCallback: () => {},
      unregisterCallback: () => {},
      addListener,
      removeListener,
    }),
    [
      device,
      connectionState,
      isConnected,
      isConnecting,
      error,
      connect,
      disconnect,
      sendRequest,
      addListener,
      removeListener,
      bleService,
      getAllDeviceInfo,
    ]
  );

  return <BLEContext.Provider value={value}>{children}</BLEContext.Provider>;
};
