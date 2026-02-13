import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { LogRefreshButton } from '../LogRefreshButton';
import * as useBLEConnectionHook from '../../../../hooks/useBLEConnection';
import * as useBLELogsHook from '../../../../hooks/useBLELogs';
import * as uiUtils from '../../../../utils/uiUtils';

// Mock hooks
vi.mock('../../../../hooks/useBLEConnection', () => ({
  useBLEConnection: vi.fn(),
}));

vi.mock('../../../../hooks/useBLELogs', () => ({
  useBLELogs: vi.fn(),
}));

vi.mock('../../../../utils/uiUtils', () => ({
  runTask: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('LogRefreshButton', () => {
  const mockShowNotification = vi.fn();
  const mockHideNotification = vi.fn();
  const mockRequestLogs = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when disconnected', () => {
    (useBLEConnectionHook.useBLEConnection as any).mockReturnValue({ isConnected: false });
    (useBLELogsHook.useBLELogs as any).mockReturnValue({ isSyncingLogs: false, requestLogs: mockRequestLogs });

    const { container } = render(
      <LogRefreshButton showNotification={mockShowNotification} hideNotification={mockHideNotification} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders button when connected', () => {
    (useBLEConnectionHook.useBLEConnection as any).mockReturnValue({ isConnected: true });
    (useBLELogsHook.useBLELogs as any).mockReturnValue({ isSyncingLogs: false, requestLogs: mockRequestLogs });

    render(
      <LogRefreshButton showNotification={mockShowNotification} hideNotification={mockHideNotification} />
    );
    expect(screen.getByTestId('refresh-logs-button')).toBeInTheDocument();
    expect(screen.getByTestId('refresh-logs-button')).toBeEnabled();
  });

  it('shows loading state when isSyncingLogs is true', () => {
    (useBLEConnectionHook.useBLEConnection as any).mockReturnValue({ isConnected: true });
    (useBLELogsHook.useBLELogs as any).mockReturnValue({ isSyncingLogs: true, requestLogs: mockRequestLogs });

    render(
      <LogRefreshButton showNotification={mockShowNotification} hideNotification={mockHideNotification} />
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByTestId('refresh-logs-button')).toBeDisabled();
  });

  it('calls runTask and manages loading state on click', async () => {
    (useBLEConnectionHook.useBLEConnection as any).mockReturnValue({ isConnected: true });
    (useBLELogsHook.useBLELogs as any).mockReturnValue({ isSyncingLogs: false, requestLogs: mockRequestLogs });

    // Mock runTask to resolve after a delay to test loading state
    let resolveTask: any;
    const taskPromise = new Promise((resolve) => { resolveTask = resolve; });
    (uiUtils.runTask as any).mockReturnValue(taskPromise);

    render(
      <LogRefreshButton showNotification={mockShowNotification} hideNotification={mockHideNotification} />
    );

    const button = screen.getByTestId('refresh-logs-button');
    fireEvent.click(button);

    // Should be loading now (local state)
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(button).toBeDisabled();

    // Check if runTask was called with correct args
    expect(uiUtils.runTask).toHaveBeenCalledWith(
        mockRequestLogs,
        expect.objectContaining({
            loadingMsg: 'refresh_started',
            successMsg: 'refresh_success',
            errorMsg: 'refresh_failed'
        })
    );

    // Resolve task
    resolveTask();

    // Should stop loading
    await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
    expect(button).toBeEnabled();
  });
});
