import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { DoorControlButton } from '../DoorControlButton';
import * as useDoorHook from '../../../../hooks/useDoor';
import * as useBLEConnectionHook from '../../../../hooks/useBLEConnection';
import * as useDeviceHook from '../../../../hooks/useDevice';

// Mock hooks
vi.mock('../../../../hooks/useDoor', () => ({
  useDoor: vi.fn(),
}));

vi.mock('../../../../hooks/useBLEConnection', () => ({
  useBLEConnection: vi.fn(),
}));

vi.mock('../../../../hooks/useDevice', () => ({
  useDevice: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => key + (opts ? JSON.stringify(opts) : ''),
  }),
}));

describe('DoorControlButton', () => {
  const mockShowNotification = vi.fn();
  const mockOpenDoor = vi.fn();
  const mockGetBatteryInfo = vi.fn();
  const mockUpdateDeviceBatteryLevel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Use real timers
  });

  it('renders disabled button when disconnected', () => {
    (useDoorHook.useDoor as any).mockReturnValue({ doorStatus: 'closed', isOpening: false, openDoor: mockOpenDoor });
    (useBLEConnectionHook.useBLEConnection as any).mockReturnValue({ isConnected: false, getBatteryInfo: mockGetBatteryInfo });
    (useDeviceHook.useDevice as any).mockReturnValue({ activeDevice: { door_pin_code: '123456' }, updateDeviceBatteryLevel: mockUpdateDeviceBatteryLevel });

    render(<DoorControlButton showNotification={mockShowNotification} />);
    const button = screen.getByTestId('open-door-button');
    expect(button).toBeDisabled();
  });

  it('renders enabled button when connected', () => {
    (useDoorHook.useDoor as any).mockReturnValue({ doorStatus: 'closed', isOpening: false, openDoor: mockOpenDoor });
    (useBLEConnectionHook.useBLEConnection as any).mockReturnValue({ isConnected: true, getBatteryInfo: mockGetBatteryInfo });
    (useDeviceHook.useDevice as any).mockReturnValue({ activeDevice: { door_pin_code: '123456' }, updateDeviceBatteryLevel: mockUpdateDeviceBatteryLevel });

    render(<DoorControlButton showNotification={mockShowNotification} />);
    const button = screen.getByTestId('open-door-button');
    expect(button).toBeEnabled();
  });

  it('shows error if no master code', async () => {
    (useDoorHook.useDoor as any).mockReturnValue({ doorStatus: 'closed', isOpening: false, openDoor: mockOpenDoor });
    (useBLEConnectionHook.useBLEConnection as any).mockReturnValue({ isConnected: true, getBatteryInfo: mockGetBatteryInfo });
    (useDeviceHook.useDevice as any).mockReturnValue({ activeDevice: { door_pin_code: '' }, updateDeviceBatteryLevel: mockUpdateDeviceBatteryLevel });

    render(<DoorControlButton showNotification={mockShowNotification} />);
    fireEvent.click(screen.getByTestId('open-door-button'));

    expect(mockOpenDoor).not.toHaveBeenCalled();
    expect(mockShowNotification).toHaveBeenCalledWith('master_code_required', 'error');
  });

  it('calls openDoor and handles success flow (waiting for close)', async () => {
    // 1. Setup Mocks
    mockOpenDoor.mockResolvedValue(undefined);
    const batteryData = new Uint8Array([85]); // 85%
    const dataView = new DataView(batteryData.buffer);
    mockGetBatteryInfo.mockResolvedValue(dataView);

    (useDoorHook.useDoor as any).mockReturnValue({ doorStatus: 'closed', isOpening: false, openDoor: mockOpenDoor });
    (useBLEConnectionHook.useBLEConnection as any).mockReturnValue({ isConnected: true, getBatteryInfo: mockGetBatteryInfo });
    (useDeviceHook.useDevice as any).mockReturnValue({ activeDevice: { id: 'dev1', door_pin_code: '123456' }, updateDeviceBatteryLevel: mockUpdateDeviceBatteryLevel });

    // 2. Render
    render(<DoorControlButton showNotification={mockShowNotification} />);

    // 3. Click Open
    const button = screen.getByTestId('open-door-button');
    fireEvent.click(button);

    // Verify open call
    expect(mockOpenDoor).toHaveBeenCalledWith('123456');

    // 4. Wait for side effects
    // The component flow:
    // Click -> openDoor() -> showNotification('door_opening') -> setWaitingForClose(true)
    // Effect (waiting=true, status=closed) -> setTimeout(0) -> showNotification('door_closed') -> getBatteryInfo -> updateDeviceBatteryLevel

    await waitFor(() => {
        expect(mockShowNotification).toHaveBeenCalledWith('door_opening', 'info');
    });

    await waitFor(() => {
        expect(mockShowNotification).toHaveBeenCalledWith('door_closed', 'success');
    });

    await waitFor(() => {
        expect(mockGetBatteryInfo).toHaveBeenCalled();
    });

    await waitFor(() => {
        expect(mockUpdateDeviceBatteryLevel).toHaveBeenCalledWith('dev1', 85);
    });
  });
});
