import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { NavigationDrawer } from '../NavigationDrawer';
import * as useDeviceHook from '../../../../hooks/useDevice';
import * as developerContextHook from '../../../../context/DeveloperContextTypes';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock hooks
vi.mock('../../../../hooks/useDevice', () => ({
  useDevice: vi.fn(),
}));

vi.mock('../../../../context/DeveloperContextTypes', () => ({
  useDeveloperContext: vi.fn(),
}));

// Mock DeveloperVersion
vi.mock('../DeveloperVersion', () => ({
  DeveloperVersion: () => <div data-testid="developer-version-mock">Version Mock</div>,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => key + (opts ? JSON.stringify(opts) : ''),
  }),
}));

describe('NavigationDrawer', () => {
  const mockShowNotification = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders menu button and drawer is initially closed', () => {
    (useDeviceHook.useDevice as any).mockReturnValue({ knownDevices: [] });
    (developerContextHook.useDeveloperContext as any).mockReturnValue({ isDeveloperMode: false });

    render(<NavigationDrawer showNotification={mockShowNotification} />);
    expect(screen.getByRole('button', { name: 'menu' })).toBeInTheDocument();
    // When closed, the drawer content (like nav-home) should not be visible
    expect(screen.queryByTestId('nav-home')).not.toBeInTheDocument();
  });

  it('opens drawer when menu button is clicked', () => {
    (useDeviceHook.useDevice as any).mockReturnValue({ knownDevices: [] });
    (developerContextHook.useDeveloperContext as any).mockReturnValue({ isDeveloperMode: false });

    render(<NavigationDrawer showNotification={mockShowNotification} />);
    fireEvent.click(screen.getByRole('button', { name: 'menu' }));

    // Check for drawer content visibility
    expect(screen.getByTestId('nav-home')).toBeInTheDocument();
  });

  it('navigates and closes drawer when item is clicked', () => {
    (useDeviceHook.useDevice as any).mockReturnValue({ knownDevices: [] });
    (developerContextHook.useDeveloperContext as any).mockReturnValue({ isDeveloperMode: false });

    render(<NavigationDrawer showNotification={mockShowNotification} />);

    // Open drawer
    fireEvent.click(screen.getByRole('button', { name: 'menu' }));

    // Click Home
    fireEvent.click(screen.getByTestId('nav-home'));

    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('renders correct device count in My Boks link', () => {
    (useDeviceHook.useDevice as any).mockReturnValue({ knownDevices: [1, 2, 3] });
    (developerContextHook.useDeveloperContext as any).mockReturnValue({ isDeveloperMode: false });

    render(<NavigationDrawer showNotification={mockShowNotification} />);
    fireEvent.click(screen.getByRole('button', { name: 'menu' }));

    expect(screen.getByTestId('nav-my-boks')).toHaveTextContent('common:my_boks{"count":3}');
  });

  it('shows developer menu item only in developer mode', () => {
    (useDeviceHook.useDevice as any).mockReturnValue({ knownDevices: [] });

    // Case 1: Dev Mode OFF
    (developerContextHook.useDeveloperContext as any).mockReturnValue({ isDeveloperMode: false });
    const { rerender } = render(<NavigationDrawer showNotification={mockShowNotification} />);
    fireEvent.click(screen.getByRole('button', { name: 'menu' }));
    expect(screen.queryByText('settings:developer.menu_title')).not.toBeInTheDocument();

    // Case 2: Dev Mode ON
    (developerContextHook.useDeveloperContext as any).mockReturnValue({ isDeveloperMode: true });
    rerender(<NavigationDrawer showNotification={mockShowNotification} />);

    // Ensure drawer is open (check nav-home visibility)
    if (!screen.queryByTestId('nav-home')) {
        fireEvent.click(screen.getByRole('button', { name: 'menu' }));
    }

    expect(screen.getByText('settings:developer.menu_title')).toBeInTheDocument();
  });
});
