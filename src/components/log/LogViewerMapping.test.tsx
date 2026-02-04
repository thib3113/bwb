import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/preact';
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

describe('LogViewer NFC Mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useDevice as any).mockReturnValue({ activeDevice: { id: 'test-device' } });
    (useBLEConnection as any).mockReturnValue({ isConnected: true });
    (useBLELogs as any).mockReturnValue({ isSyncingLogs: false, requestLogs: vi.fn() });
    (useLogCount as any).mockReturnValue({ logCount: 10 });
  });

  it('maps tag UID to name and translates tag type', async () => {
    // Mock Logs
    const mockLogs = [
      {
        id: 1,
        device_id: 'test-device',
        timestamp: new Date().toISOString(),
        opcode: BLEOpcode.LOG_EVENT_NFC_OPENING, // 0xC2
        // Type 1 (La Poste), Len 4, UID AA:BB:CC:DD
        payload: new Uint8Array([0x00, 0x00, 0x00, 0x01, 0x04, 0xAA, 0xBB, 0xCC, 0xDD]),
        synced: true,
        event: 'Raw NFC Event',
        type: 'info',
      },
    ];

    // Mock Tags
    const mockTags = [
      {
        id: 'tag-1',
        device_id: 'test-device',
        uid: 'AA:BB:CC:DD',
        name: 'My Custom Tag',
        type: 1,
      },
    ];

    // useLiveQuery mock implementation
    // First call is logs, second is tags
    (useLiveQuery as any)
      .mockReturnValueOnce(mockLogs) // logsQuery
      .mockReturnValueOnce(mockTags); // nfcTags

    const { container, getAllByLabelText, getByText } = render(
      <LogViewer showNotification={vi.fn()} hideNotification={vi.fn()} />
    );

    // Expand the row to see details
    const expandButtons = getAllByLabelText('expand row');
    expect(expandButtons.length).toBe(1);
    fireEvent.click(expandButtons[0]);

    // Check for Mapped Name
    // "My Custom Tag (AA:BB:CC:DD)"
    expect(container.textContent).toContain('My Custom Tag (AA:BB:CC:DD)');

    // Check for Translated Type
    // In mock, t(key) returns key. So we expect "nfc_tag_types.1"
    expect(container.textContent).toContain('nfc_tag_types.1');
  });
});
