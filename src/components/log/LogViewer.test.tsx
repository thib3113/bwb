import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/preact';
import { LogViewer } from './LogViewer';
import { BLEOpcode } from '../../utils/bleConstants';
// Mock necessary hooks
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

vi.mock('../../hooks/useDevice', () => ({
  useDevice: vi.fn(),
}));

vi.mock('../../hooks/useBLEConnection', () => ({
  useBLEConnection: vi.fn(),
}));

vi.mock('../../hooks/useBLELogs', () => ({
  useBLELogs: vi.fn(),
}));

vi.mock('../../hooks/useLogCount', () => ({
  useLogCount: vi.fn(),
}));

vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: vi.fn(),
}));

// Import mocks to configure them
import { useDevice } from '../../hooks/useDevice';
import { useBLEConnection } from '../../hooks/useBLEConnection';
import { useBLELogs } from '../../hooks/useBLELogs';
import { useLogCount } from '../../hooks/useLogCount';
import { useLiveQuery } from 'dexie-react-hooks';

describe('LogViewer Render Performance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useDevice as any).mockReturnValue({ activeDevice: { id: 'test-device' } });
    (useBLEConnection as any).mockReturnValue({ isConnected: true });
    (useBLELogs as any).mockReturnValue({ isSyncingLogs: false, requestLogs: vi.fn() });
    (useLogCount as any).mockReturnValue({ logCount: 10 });
  });

  it('renders logs and updates state', async () => {
    // Mock logs
    const mockLogs = [
      {
        id: '1',
        device_id: 'test-device',
        timestamp: new Date().toISOString(),
        opcode: BLEOpcode.LOG_CODE_BLE_VALID,
        payload: new Uint8Array([0x00, 0x00, 0x00, 0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x00, 0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66]),
        raw: new Uint8Array([0x86, 0x11, 0x00, 0x00, 0x00, 0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x00, 0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66]),
        synced: true,
        event: 'Raw Event 1',
        type: 'info',
      },
      {
        id: '2',
        device_id: 'test-device',
        timestamp: new Date().toISOString(),
        opcode: BLEOpcode.LOG_CODE_BLE_INVALID,
        payload: new Uint8Array([0x00, 0x00, 0x00, 0x36, 0x35, 0x34, 0x33, 0x32, 0x31, 0x00, 0x00, 0x66, 0x55, 0x44, 0x33, 0x22, 0x11]),
        raw: new Uint8Array([0x88, 0x11, 0x00, 0x00, 0x00, 0x36, 0x35, 0x34, 0x33, 0x32, 0x31, 0x00, 0x00, 0x66, 0x55, 0x44, 0x33, 0x22, 0x11]),
        synced: true,
        event: 'Raw Event 2',
        type: 'error',
      },
    ];

    (useLiveQuery as any).mockReturnValue(mockLogs);

    // We can spy on console.log to detect the render phases or wrapped component
    // But easier is to wrap the component or add a spy in the props if possible.
    // However, since we are testing internal state updates triggering re-renders,
    // we can check if the output changes over time.

    // Actually, to count renders, we can create a wrapper component or use a profiler.
    // Or we can spy on a function that is called during render.
    // `useLiveQuery` is called during render. But it might be called multiple times.

    // Let's rely on the fact that the current implementation has a `setTimeout`
    // which triggers a state update `setParsedLogs`.

    const { container } = render(
      <LogViewer showNotification={vi.fn()} hideNotification={vi.fn()} />
    );

    // Initial render should show nothing or loading if logs are empty,
    // but here logs are present.
    // The current code:
    // 1. renders with `logs` from useLiveQuery. `parsedLogs` is empty [].
    // 2. useEffect triggers. setTimeout(..., 0).
    // 3. setTimeout callback runs -> setParsedLogs.
    // 4. Re-render with `parsedLogs` populated.

    // So initially, the table body should be empty or show raw logs (depending on fallback).
    // The code says: `parsedLogs.length > 0 ? (Table...) : logs.length > 0 ? (Box...)`
    // So initially it renders the "Box" with raw logs.
    // Then it updates to "Table" with parsed logs.

    // With useMemo, the parsed logs should be available immediately (in the first render)
    // assuming logs are available from the hook.
    // The Box view (raw logs) should NOT appear if parsing is synchronous and logs are ready.

    // We expect the parsed event description immediately.
    // We check for text content because MUI components might not render standard tags in this test env
    expect(container.textContent).toContain('logs:events.ble_valid');

    // And we explicitly expect NOT to see the raw event fallbacks
    expect(container.textContent).not.toContain('Raw Event 1');

    // Verify that we are no longer showing the raw event from the Box view (optional, but good for confirmation)
    // The raw view shows ": Raw Event 1", the table view shows it in a cell without colon prefix usually,
    // but the key distinction is "events.valid_open_code" is ONLY in parsed logs.
  });
});
