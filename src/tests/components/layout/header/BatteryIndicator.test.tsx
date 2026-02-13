import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { BatteryIndicator } from '../../../../components/layout/header/BatteryIndicator';
import * as useDeviceHook from '../../../../hooks/useDevice';
import * as useBLEConnectionHook from '../../../../hooks/useBLEConnection';

// Mock hooks
vi.mock('../../../../hooks/useDevice', () => ({
  useDevice: vi.fn(),
}));

vi.mock('../../../../hooks/useBLEConnection', () => ({
  useBLEConnection: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => `${key} ${options?.level ?? ''}`.trim(),
  }),
}));

describe('BatteryIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when battery level is undefined', () => {
    (useDeviceHook.useDevice as any).mockReturnValue({ activeDevice: undefined });
    (useBLEConnectionHook.useBLEConnection as any).mockReturnValue({ device: undefined });

    const { container } = render(<BatteryIndicator />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders battery level from activeDevice', () => {
    (useDeviceHook.useDevice as any).mockReturnValue({ activeDevice: { battery_level: 50 } });
    (useBLEConnectionHook.useBLEConnection as any).mockReturnValue({ device: undefined });

    render(<BatteryIndicator />);
    expect(screen.getByTestId('battery-level-text')).toHaveTextContent('50%');
    expect(screen.getByTestId('battery-icon-std')).toBeInTheDocument();
  });

  it('renders battery level from device fallback', () => {
    (useDeviceHook.useDevice as any).mockReturnValue({ activeDevice: undefined });
    (useBLEConnectionHook.useBLEConnection as any).mockReturnValue({ device: { battery_level: 60 } });

    render(<BatteryIndicator />);
    expect(screen.getByTestId('battery-level-text')).toHaveTextContent('60%');
  });

  it('renders alert icon for low battery (<20)', () => {
    (useDeviceHook.useDevice as any).mockReturnValue({ activeDevice: { battery_level: 15 } });
    (useBLEConnectionHook.useBLEConnection as any).mockReturnValue({ device: undefined });

    render(<BatteryIndicator />);
    expect(screen.getByTestId('battery-level-text')).toHaveTextContent('15%');
    expect(screen.getByTestId('battery-icon-alert')).toBeInTheDocument();
  });

  it('renders full icon for high battery (>90)', () => {
    (useDeviceHook.useDevice as any).mockReturnValue({ activeDevice: { battery_level: 95 } });
    (useBLEConnectionHook.useBLEConnection as any).mockReturnValue({ device: undefined });

    render(<BatteryIndicator />);
    expect(screen.getByTestId('battery-level-text')).toHaveTextContent('95%');
    expect(screen.getByTestId('battery-icon-full')).toBeInTheDocument();
  });
});
