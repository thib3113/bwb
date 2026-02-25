import { BoksController } from '@thib3113/boks-sdk';
import { ReactNode, useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { BoksHardwareSimulator, SimulatorTransport } from '@thib3113/boks-sdk/simulator';
import { BLEContext } from './Contexts';
import { useLogContext } from '../hooks/useLogContext';
import { BluetoothDevice } from '../types';
import { BLEPacket } from '../utils/packetParser';

type BLEServiceState = 'disconnected' | 'scanning' | 'connecting' | 'connected' | 'disconnecting';

export const BLEProvider = ({ children }: { children: ReactNode }) => {
  const { log } = useLogContext();

  // Singleton controller reference
  const controllerRef = useRef<BoksController | null>(null);
  const simulatorRef = useRef<BoksHardwareSimulator | null>(null);

  // State
  const [connectionState, setConnectionState] = useState<BLEServiceState>('disconnected');
  const [device, setDevice] = useState<BluetoothDevice | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Listener management
  const listenersRef = useRef<Map<string | number, Set<(packet: BLEPacket) => void>>>(new Map());

  // Initialize Controller
  if (!controllerRef.current) {
    const useSimulator =
      (typeof __BOKS_SIMULATOR_AUTO_ENABLE__ !== 'undefined' && __BOKS_SIMULATOR_AUTO_ENABLE__) ||
      (typeof window !== 'undefined' && window.BOKS_SIMULATOR_ENABLED === true) ||
      (typeof localStorage !== 'undefined' &&
        localStorage.getItem('BOKS_SIMULATOR_ENABLED') === 'true');

    if (useSimulator) {
      console.warn('⚠️ USING BOKS SDK SIMULATOR ⚠️');
      const sim = new BoksHardwareSimulator();
      // Configure Simulator Defaults
      sim.setMasterKey('0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF');
      sim.setVersion('4.3.3', '10/125'); // Default to compatible version

      simulatorRef.current = sim;

      // Persist state if possible (optional enhancement)
      const transport = new SimulatorTransport(sim);
      controllerRef.current = new BoksController({ transport });

      // Expose for debugging
      if (typeof window !== 'undefined') {
        // Mock legacy resilience methods for E2E tests
        const simAny = sim as any;
        simAny.failNextConnection = () => {
          console.log('Simulating next connection failure');
          simAny._shouldFailNextConnection = true;
        };
        simAny.failNextDiscovery = () => {
          console.log('Simulating next discovery failure');
          simAny._shouldFailNextDiscovery = true;
        };

        // eslint-disable-next-line react-hooks/immutability
        window.boksSimulator = sim;
      }
    } else {
      controllerRef.current = new BoksController();
    }
  }

  const controller = controllerRef.current;

  // Connection Management
  const connect = useCallback(async () => {
    try {
      // Legacy simulation support for E2E tests
      if (simulatorRef.current) {
        const sim = simulatorRef.current as any;
        if (sim._shouldFailNextDiscovery) {
          sim._shouldFailNextDiscovery = false;
          throw new Error('Simulated discovery failure');
        }
        if (sim._shouldFailNextConnection) {
          sim._shouldFailNextConnection = false;
          throw new Error('Simulated connection failure');
        }
      }

      setConnectionState('scanning');
      await controller.connect();
      setConnectionState('connected');
      setError(null);

      // Create a mock device object for UI compatibility
      const mockDevice: BluetoothDevice = {
        id: 'Boks-Device',
        name: 'Boks Device',
        gatt: { connected: true } as any,
        addEventListener: () => {},
        removeEventListener: () => {}
      } as unknown as BluetoothDevice;

      setDevice(mockDevice);

      log('Connected successfully via SDK!', 'info');
    } catch (e: any) {
      setConnectionState('disconnected');
      setError(e.message || 'Connection failed');
      log(`Connection error: ${e.message}`, 'error');
      throw e;
    }
  }, [controller, log]);

  const disconnect = useCallback(async () => {
    try {
      await controller.disconnect();
      setConnectionState('disconnected');
      setDevice(null);
    } catch (e) {
      console.error('Disconnect error', e);
    }
  }, [controller]);

  // Packet Listener Bridge
  useEffect(() => {
    const unsub = controller.onPacket((packet) => {
      // Convert SDK packet to App BLEPacket format if needed, or just pass compatible fields
      // Ensure payload is defined to prevent "Cannot read properties of undefined (reading 'length')"
      const mappedPacket: BLEPacket = {
        opcode: packet.opcode,
        payload: packet.payload || new Uint8Array(),
        raw: packet.raw || new Uint8Array(),
        direction: 'RX',
        isValidChecksum: true
      };

      // Notify generic listeners
      const genericListeners = listenersRef.current.get('*');
      if (genericListeners) {
        genericListeners.forEach((cb) => cb(mappedPacket));
      }

      // Notify opcode specific listeners
      const specificListeners = listenersRef.current.get(packet.opcode);
      if (specificListeners) {
        specificListeners.forEach((cb) => cb(mappedPacket));
      }

      // Also notify string-based keys if used (e.g. 'opcode_161')
      const strKey = `opcode_${packet.opcode}`;
      const strListeners = listenersRef.current.get(strKey);
      if (strListeners) {
        strListeners.forEach((cb) => cb(mappedPacket));
      }

      // Populate legacy debugging globals for E2E tests
      if (typeof window !== 'undefined') {
        if (!(window as any).txEvents) (window as any).txEvents = [];
        (window as any).txEvents.push({
          op: packet.opcode,
          payload: packet.payload ? Array.from(packet.payload) : []
        });
      }
    });

    return () => unsub();
  }, [controller]);

  // Listener API
  const addListener = useCallback(
    (event: string | number, callback: (packet: BLEPacket) => void) => {
      if (!listenersRef.current.has(event)) {
        listenersRef.current.set(event, new Set());
      }
      listenersRef.current.get(event)!.add(callback);
    },
    []
  );

  const removeListener = useCallback(
    (event: string | number, callback: (packet: BLEPacket) => void) => {
      const set = listenersRef.current.get(event);
      if (set) {
        set.delete(callback);
      }
    },
    []
  );

  // Simulator Toggle
  const toggleSimulator = useCallback((enable: boolean) => {
    if (typeof window !== 'undefined') {
      window.BOKS_SIMULATOR_ENABLED = enable;
      localStorage.setItem('BOKS_SIMULATOR_ENABLED', String(enable));
      window.location.reload(); // Simple reload to re-init controller
    }
  }, []);

  // Expose toggleSimulator globally for E2E tests
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).toggleSimulator = toggleSimulator;
    }
  }, [toggleSimulator]);

  const value = useMemo(
    () => ({
      controller, // Expose the controller directly
      device,
      connectionState,
      isConnected: connectionState === 'connected',
      isConnecting: connectionState === 'scanning' || connectionState === 'connecting',
      error,
      connect,
      disconnect,
      addListener,
      removeListener,
      toggleSimulator,
      // Deprecated / Compatibility stubs
      sendPacket: async () => {
        console.warn('sendPacket is deprecated');
      },
      sendRequest: async (_arg1: any) => {
        console.warn('sendRequest is deprecated. Please use controller methods.');
        throw new Error('sendRequest is deprecated. Use controller methods.');
      },
      getDeviceInfo: async () => controller.hardwareInfo || {},
      getBatteryInfo: async () => controller.getBatteryLevel(),
      readCharacteristic: async () => {
        throw new Error('Not supported in SDK mode');
      }
    }),
    [
      controller,
      device,
      connectionState,
      error,
      connect,
      disconnect,
      addListener,
      removeListener,
      toggleSimulator
    ]
  );

  return <BLEContext.Provider value={value}>{children}</BLEContext.Provider>;
};
