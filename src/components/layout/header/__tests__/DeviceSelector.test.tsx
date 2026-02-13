import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom'; // Import matchers
import { DeviceSelector } from '../DeviceSelector';
import * as useDeviceHook from '../../../../hooks/useDevice';

// Mock the hook
vi.mock('../../../../hooks/useDevice', () => ({
  useDevice: vi.fn(),
}));

describe('DeviceSelector', () => {
  const mockSetActiveDevice = vi.fn();
  const mockDevices = [
    { id: 'device-1', friendly_name: 'My Boks 1' },
    { id: 'device-2', friendly_name: 'My Boks 2' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when there is only 1 known device', () => {
    (useDeviceHook.useDevice as any).mockReturnValue({
      knownDevices: [mockDevices[0]],
      activeDevice: mockDevices[0],
      setActiveDevice: mockSetActiveDevice,
    });

    const { container } = render(<DeviceSelector />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders select when there are multiple devices', () => {
    (useDeviceHook.useDevice as any).mockReturnValue({
      knownDevices: mockDevices,
      activeDevice: mockDevices[0],
      setActiveDevice: mockSetActiveDevice,
    });

    render(<DeviceSelector />);
    // Select input is usually hidden, but we can check for the combobox role or display value
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(screen.getByText('My Boks 1')).toBeInTheDocument();
  });

  it('calls setActiveDevice when a new device is selected', () => {
    (useDeviceHook.useDevice as any).mockReturnValue({
      knownDevices: mockDevices,
      activeDevice: mockDevices[0],
      setActiveDevice: mockSetActiveDevice,
    });

    render(<DeviceSelector />);

    // Open the dropdown
    const select = screen.getByRole('combobox');
    fireEvent.mouseDown(select);

    // Click the second option
    const option2 = screen.getByRole('option', { name: 'My Boks 2' });
    fireEvent.click(option2);

    expect(mockSetActiveDevice).toHaveBeenCalledWith('device-2');
  });
});
