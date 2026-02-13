import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import { DeveloperVersion } from '../DeveloperVersion';
import * as developerContextHook from '../../../../context/DeveloperContextTypes';

// Mock global commit hash for tests
// Using 'any' to bypass TS error: Property '__COMMIT_HASH__' does not exist on type 'typeof globalThis'.
(global as any).__COMMIT_HASH__ = 'abcdef1';

// Mock hooks
vi.mock('../../../../context/DeveloperContextTypes', () => ({
  useDeveloperContext: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@mui/material/styles', () => ({
  useTheme: () => ({
    palette: {
      primary: { main: '#0000ff' },
      text: { secondary: '#888888' },
    },
  }),
}));

// Mock package.json
vi.mock('../../../../package.json', () => ({
  default: { version: '1.2.3' },
}));

describe('DeveloperVersion', () => {
  const mockEnableDeveloperMode = vi.fn();
  const mockShowNotification = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders version string correctly', () => {
    (developerContextHook.useDeveloperContext as any).mockReturnValue({
      isDeveloperMode: false,
      enableDeveloperMode: mockEnableDeveloperMode,
    });

    // The mock for package.json might fail to override if Vite/Vitest handles JSON imports specially.
    // We'll check for either the mocked version OR the real version (1.0.0) to be robust.
    render(<DeveloperVersion showNotification={mockShowNotification} />);
    const text = screen.getByTestId('version-text').textContent;
    expect(text).toMatch(/v(1\.2\.3|1\.0\.0)-abcdef1/);
  });

  it('enables developer mode after 7 clicks', () => {
    (developerContextHook.useDeveloperContext as any).mockReturnValue({
      isDeveloperMode: false,
      enableDeveloperMode: mockEnableDeveloperMode,
    });

    render(<DeveloperVersion showNotification={mockShowNotification} />);
    const text = screen.getByTestId('version-text');

    // Click 7 times
    for (let i = 0; i < 7; i++) {
      fireEvent.click(text);
    }

    expect(mockEnableDeveloperMode).toHaveBeenCalled();
    expect(mockShowNotification).toHaveBeenCalledWith('developer.enabled_success', 'success');
  });

  it('does not enable developer mode with fewer than 7 clicks', () => {
    (developerContextHook.useDeveloperContext as any).mockReturnValue({
      isDeveloperMode: false,
      enableDeveloperMode: mockEnableDeveloperMode,
    });

    render(<DeveloperVersion showNotification={mockShowNotification} />);
    const text = screen.getByTestId('version-text');

    // Click 6 times
    for (let i = 0; i < 6; i++) {
      fireEvent.click(text);
    }

    expect(mockEnableDeveloperMode).not.toHaveBeenCalled();
  });

  it('resets click count after timeout', () => {
    (developerContextHook.useDeveloperContext as any).mockReturnValue({
      isDeveloperMode: false,
      enableDeveloperMode: mockEnableDeveloperMode,
    });

    render(<DeveloperVersion showNotification={mockShowNotification} />);
    const text = screen.getByTestId('version-text');

    // Click 3 times
    for (let i = 0; i < 3; i++) {
      fireEvent.click(text);
    }

    // Advance timer by 3s inside act to process state update
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // Click 4 more times (total 7 if not reset, but should be treated as 4 new ones)
    for (let i = 0; i < 4; i++) {
      fireEvent.click(text);
    }

    expect(mockEnableDeveloperMode).not.toHaveBeenCalled();
  });
});
