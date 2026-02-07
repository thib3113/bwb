import { renderHook, waitFor } from '@testing-library/preact';
import { useState, useEffect } from 'preact/hooks';
import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';

// Mock dependencies BEFORE imports
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      changeLanguage: () => new Promise(() => {}),
    },
  }),
  initReactI18next: {
    type: '3rdParty',
    init: () => {},
  }
}));

// Mock dexie-react-hooks
vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: (querier: () => Promise<any[]> | any[], deps: any[]) => {
    // Return empty array initially to be safe
    const [data, setData] = useState<any[]>([]);

    useEffect(() => {
       const fetchData = async () => {
         try {
           const res = await querier();
           setData(res || []);
         } catch (e) {
           console.error(e);
           setData([]);
         }
       }
       fetchData();
    }, []); // Run once

    return data;
  }
}));

// Imports after mocks
import { useCodeLogic } from '../../hooks/useCodeLogic';
import { db } from '../../db/db';
import { CODE_TYPES, APP_DEFAULTS } from '../../utils/constants';
import { CODE_STATUS } from '../../constants/codeStatus';
import { DeviceContext, TaskContext, BLEContext, LogContext } from '../../context/Contexts';
import { BoksDevice, UserRole } from '../../types';

// Mock dependencies
const mockAddTask = vi.fn();
const mockShowNotification = vi.fn();
const mockHideNotification = vi.fn();
const mockSendRequest = vi.fn();

const activeDevice: BoksDevice = {
  id: 'test-device-id',
  ble_name: 'Test Device',
  friendly_name: 'Test Device',


  updated_at: Date.now(),

  role: UserRole.Admin,
  sync_status: 'synced',
};

const wrapper = ({ children }: { children: any }) => (
  <DeviceContext.Provider value={{
    activeDevice, codeCount: null,

    refreshCodeCount: vi.fn(),
    knownDevices: [],
    setActiveDevice: vi.fn(),
    updateDeviceBatteryLevel: vi.fn(),
    registerDevice: vi.fn(),
    removeDevice: vi.fn(),
    updateDeviceName: vi.fn(),
    updateDeviceDetails: vi.fn(),
    toggleLaPoste: vi.fn(),
    logCount: 0,
    activeDeviceId: activeDevice.id
  }}>
    <LogContext.Provider value={{
      log: vi.fn(),
      addDebugLog: vi.fn(),
      clearDebugLogs: vi.fn(),
      logs: [],
      debugLogs: [],
      parseLog: vi.fn()
    }}>
      <BLEContext.Provider value={{
        isConnected: false,
        isConnecting: false,
        connect: vi.fn(),
        disconnect: vi.fn(),
        sendRequest: mockSendRequest,
        device: null,
        error: null,
        connectionState: 'disconnected',
        sendPacket: vi.fn(),
        getDeviceInfo: vi.fn(),
        getBatteryInfo: vi.fn(),
        readCharacteristic: vi.fn(),
        registerCallback: vi.fn(),
        unregisterCallback: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        toggleSimulator: vi.fn()
      }}>
        <TaskContext.Provider value={{
          addTask: mockAddTask,
          tasks: [],
          retryTask: vi.fn(),
        }}>
          {children}
        </TaskContext.Provider>
      </BLEContext.Provider>
    </LogContext.Provider>
  </DeviceContext.Provider>
);

describe('useCodeLogic', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await db.codes.clear();
    await db.logs.clear();
  });

  afterEach(async () => {
    await db.codes.clear();
  });

  it('should filter out used temporary codes from temporaryCodes list', async () => {
    const now = new Date().toISOString();

    // Add codes
    await db.codes.bulkAdd([
      {
        id: 'm1',
        device_id: activeDevice.id,
        type: CODE_TYPES.MASTER,
        code: '111111',
        name: 'Master Used',
        status: CODE_STATUS.ON_DEVICE,
        created_at: now,
        usedAt: now,
        author_id: APP_DEFAULTS.AUTHOR_ID,
        sync_status: 'synced'
      },
      {
        id: 'm2',
        device_id: activeDevice.id,
        type: CODE_TYPES.MASTER,
        code: '222222',
        name: 'Master Unused',
        status: CODE_STATUS.ON_DEVICE,
        created_at: now,
        author_id: APP_DEFAULTS.AUTHOR_ID,
        sync_status: 'synced'
      },
      {
        id: 's1',
        device_id: activeDevice.id,
        type: CODE_TYPES.SINGLE,
        code: '333333',
        name: 'Single Used',
        status: CODE_STATUS.ON_DEVICE,
        created_at: now,
        usedAt: now,
        author_id: APP_DEFAULTS.AUTHOR_ID,
        sync_status: 'synced'
      },
      {
        id: 's2',
        device_id: activeDevice.id,
        type: CODE_TYPES.SINGLE,
        code: '444444',
        name: 'Single Unused',
        status: CODE_STATUS.ON_DEVICE,
        created_at: now,
        author_id: APP_DEFAULTS.AUTHOR_ID,
        sync_status: 'synced'
      }
    ]);

    const { result } = renderHook(() => useCodeLogic(mockShowNotification, mockHideNotification), { wrapper });

    await waitFor(() => {
      expect(result.current.masterCodes).toHaveLength(2);
      expect(result.current.temporaryCodes).toHaveLength(1);
      expect(result.current.temporaryCodes[0].id).toBe('s2');
    });
  });
});
