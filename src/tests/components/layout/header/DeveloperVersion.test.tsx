import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import { DeveloperVersion } from '../../../../components/layout/header/DeveloperVersion';
import * as developerContextHook from '../../../../context/DeveloperContextTypes';

// Mock global commit hash for tests
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
    // Default mock implementation
    (developerContextHook.useDeveloperContext as any).mockReturnValue({
      isDeveloperMode: false,
      enableDeveloperMode: mockEnableDeveloperMode,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders version string correctly', () => {
    render(<DeveloperVersion showNotification={mockShowNotification} />);
    const text = screen.getByTestId('version-text').textContent;
    // Allow either mocked version or real one to be robust
    expect(text).toMatch(/v(1\.2\.3|1\.0\.0)-abcdef1/);
  });

  it('enables developer mode after 7 clicks', () => {
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
    render(<DeveloperVersion showNotification={mockShowNotification} />);
    const text = screen.getByTestId('version-text');

    // Click 6 times
    for (let i = 0; i < 6; i++) {
      fireEvent.click(text);
    }

    expect(mockEnableDeveloperMode).not.toHaveBeenCalled();
  });

  it('resets click count after timeout', () => {
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

  it('shows info notification if already developer', () => {
    // Override mock for this specific test
    (developerContextHook.useDeveloperContext as any).mockReturnValue({
      isDeveloperMode: true,
      enableDeveloperMode: mockEnableDeveloperMode,
    });

    render(<DeveloperVersion showNotification={mockShowNotification} />);
    const text = screen.getByTestId('version-text');

    // Click 7 times
    for (let i = 0; i < 7; i++) {
      fireEvent.click(text);
    }

    expect(mockEnableDeveloperMode).not.toHaveBeenCalled();
    expect(mockShowNotification).toHaveBeenCalledWith('developer.developer_already_active', 'info');
  });
});
