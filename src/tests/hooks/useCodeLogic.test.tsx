import { renderHook, waitFor } from '@testing-library/react';
import React, { useEffect, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
// Imports after mocks
import { useCodeLogic } from '../../hooks/useCodeLogic';
import { db } from '../../db/db';
import { APP_DEFAULTS } from '../../utils/constants';
import { CODE_STATUS } from '../../constants/codeStatus';
import { BLEContext, DeviceContext, LogContext, TaskContext } from '../../context/Contexts';
import { BoksDevice, CODE_TYPE, UserRole, BoksCode } from '../../types';
import { BLEOpcode } from '../../utils/bleConstants';

// Mock dependencies BEFORE imports
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      changeLanguage: () => new Promise(() => {}),
      language: 'en'
    }
  }),
  initReactI18next: {
    type: '3rdParty',
    init: () => {}
  }
}));

// Mock dexie-react-hooks
vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: (querier: () => any) => {
    const [data, setData] = useState<any>(undefined);

    useEffect(() => {
      const fetchData = async () => {
        try {
          const res = await querier();
          setData(res);
        } catch (e) {
          console.error(e);
          setData([]);
        }
      };
      fetchData();
    }, []); // Run once for simple mock

    return data;
  }
}));

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
  sync_status: 'synced'
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <DeviceContext.Provider
    value={{
      activeDevice,
      codeCount: null,
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
    }}
  >
    <LogContext.Provider
      value={{
        log: vi.fn(),
        addDebugLog: vi.fn(),
        clearDebugLogs: vi.fn(),
        logs: [],
        debugLogs: [],
        parseLog: vi.fn()
      }}
    >
      <BLEContext.Provider
        value={{
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
        }}
      >
        <TaskContext.Provider
          value={{
            addTask: mockAddTask,
            tasks: [],
            retryTask: vi.fn(), syncTasks: vi.fn()
          }}
        >
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
        type: CODE_TYPE.MASTER,
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
        type: CODE_TYPE.MASTER,
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
        type: CODE_TYPE.SINGLE,
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
        type: CODE_TYPE.SINGLE,
        code: '444444',
        name: 'Single Unused',
        status: CODE_STATUS.ON_DEVICE,
        created_at: now,
        author_id: APP_DEFAULTS.AUTHOR_ID,
        sync_status: 'synced'
      }
    ]);

    const { result } = renderHook(() => useCodeLogic(mockShowNotification, mockHideNotification), {
      wrapper
    });

    await waitFor(
      () => {
        expect(result.current.masterCodes).toHaveLength(2);
        expect(result.current.temporaryCodes).toHaveLength(1);
        expect(result.current.temporaryCodes[0].id).toBe('s2');
      },
      { timeout: 2000 }
    );
  });

  it('should correctly identify last usage of master code from logs', async () => {
    const now = new Date();
    const older = new Date(now.getTime() - 100000);
    const newer = new Date(now.getTime() - 50000);

    // Add master code
    const masterCode: BoksCode = {
      id: 'm_test',
      device_id: activeDevice.id,
      type: CODE_TYPE.MASTER,
      code: '999999',
      name: 'Test Master',
      status: CODE_STATUS.ON_DEVICE,
      created_at: older.toISOString(),
      author_id: APP_DEFAULTS.AUTHOR_ID,
      sync_status: 'synced'
    };

    await db.codes.add(masterCode);

    // Add logs
    await db.logs.bulkAdd([
      {
        id: 'log1',
        device_id: activeDevice.id,
        timestamp: older.getTime(),
        opcode: BLEOpcode.LOG_CODE_BLE_VALID_HISTORY, // 0x86
        payload: new Uint8Array([]),
        raw: new Uint8Array([]),
        data: { code: '999999' },
        event: 'CODE_BLE_VALID',
        type: 'info',
        synced: true,
        updated_at: Date.now()
      },
      {
        id: 'log2',
        device_id: activeDevice.id,
        timestamp: newer.getTime(),
        opcode: BLEOpcode.LOG_CODE_KEY_VALID_HISTORY, // 0x87
        payload: new Uint8Array([]),
        raw: new Uint8Array([]),
        data: { code: '999999' },
        event: 'CODE_KEY_VALID',
        type: 'info',
        synced: true,
        updated_at: Date.now()
      },
      {
        id: 'log3',
        device_id: activeDevice.id,
        timestamp: newer.getTime() + 1000,
        opcode: BLEOpcode.LOG_CODE_BLE_VALID_HISTORY,
        payload: new Uint8Array([]),
        raw: new Uint8Array([]),
        data: { code: 'OTHER' }, // Different code
        event: 'CODE_BLE_VALID',
        type: 'info',
        synced: true,
        updated_at: Date.now()
      }
    ]);

    const { result } = renderHook(() => useCodeLogic(mockShowNotification, mockHideNotification), {
      wrapper
    });

    await waitFor(() => {
        // Wait for logs to be loaded
        if (result.current.logs.length === 0) throw new Error('Logs not loaded yet');

        // We can pass our code object to deriveCodeMetadata
        const metadata = result.current.deriveCodeMetadata(masterCode as any);

        expect(metadata.lastUsed).toBeDefined();
        expect(metadata.lastUsed?.getTime()).toBe(newer.getTime());
        expect(metadata.used).toBe(false);
    }, { timeout: 2000 });
  });

});
