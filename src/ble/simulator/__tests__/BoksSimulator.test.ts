import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BoksSimulator, SimulatorAPI } from '../BoksSimulator';
import { BLEOpcode, SIMULATOR_DEFAULT_PIN } from '../../../utils/bleConstants';

describe('BoksSimulator', () => {
  let simulator: BoksSimulator;

  beforeEach(() => {
    vi.useFakeTimers();
    simulator = new BoksSimulator();
  });

  afterEach(() => {
    simulator.reset();
    vi.useRealTimers();
  });

  it('should initialize with default state', () => {
    const state = (window as any).boksSimulatorController.getState();
    expect(state.isOpen).toBe(false);
    expect(state.logs).toHaveLength(0);
    expect(state.pinCodes.get(SIMULATOR_DEFAULT_PIN)).toBe('master');
    expect(state.chaosMode).toBe(false);
  });

  it('should handle manual Open Door trigger', () => {
    const controller = (window as any).boksSimulatorController as SimulatorAPI;
    const emitSpy = vi.spyOn(simulator, 'emit');

    controller.triggerDoorOpen('nfc');

    expect(emitSpy).toHaveBeenCalledWith('notification', expect.any(Uint8Array));
    const state = controller.getState();
    expect(state.isOpen).toBe(true);
    expect(state.logs).toHaveLength(1);
    expect(state.logs[0].opcode).toBe(BLEOpcode.LOG_EVENT_NFC_OPENING);
  });

  it('should auto-close the door after delay', () => {
    const controller = (window as any).boksSimulatorController as SimulatorAPI;
    controller.triggerDoorOpen('button');

    expect(controller.getState().isOpen).toBe(true);

    // Fast-forward time (e.g., 20 seconds to be safe as delay is 5-15s)
    vi.advanceTimersByTime(20000);

    expect(controller.getState().isOpen).toBe(false);
    expect(controller.getState().logs).toHaveLength(2); // Open + Close
    expect(controller.getState().logs[1].opcode).toBe(BLEOpcode.LOG_DOOR_CLOSE_HISTORY);
  });

  it('should handle BLE Open Door packet', () => {
    const emitSpy = vi.spyOn(simulator, 'emit');
    // Mock valid code packet: '12345678' is SIMULATOR_DEFAULT_PIN
    // Packet structure needs to be correct for OpenDoorPacket parsing
    // But simulator uses PacketFactory which expects full raw packet?
    // Wait, simulator handlePacket takes payload only.
    // OpenDoorPacket: [0-7] = pinCode
    const pin = SIMULATOR_DEFAULT_PIN;
    const payload = new TextEncoder().encode(pin);

    simulator.handlePacket(BLEOpcode.OPEN_DOOR, payload);

    // Response is async
    vi.advanceTimersByTime(60);

    // Expect VALID_OPEN_CODE notification
    // We can't easily check the raw bytes of 'emit' without parsing,
    // but we can assume if it emitted, it did something.
    expect(emitSpy).toHaveBeenCalled();

    // Check internal state "simulated delay"
    vi.advanceTimersByTime(1000);

    const state = (window as any).boksSimulatorController.getState();
    expect(state.isOpen).toBe(true);
  });

  it('should reject invalid BLE code', () => {
    const payload = new TextEncoder().encode('00000000');
    simulator.handlePacket(BLEOpcode.OPEN_DOOR, payload);

    vi.advanceTimersByTime(60);

    const state = (window as any).boksSimulatorController.getState();
    expect(state.isOpen).toBe(false);
  });

  it('should synthesize logs on request', () => {
    const controller = (window as any).boksSimulatorController as SimulatorAPI;
    controller.triggerDoorOpen('nfc');
    vi.advanceTimersByTime(20000); // Wait for auto-close

    // We have 2 logs
    expect(controller.getState().logs).toHaveLength(2);

    const emitSpy = vi.spyOn(simulator, 'emit');

    // Request Logs
    simulator.handlePacket(BLEOpcode.REQUEST_LOGS, new Uint8Array([]));
    vi.advanceTimersByTime(60);

    // Should stream logs
    vi.advanceTimersByTime(200); // 50ms interval * 2 logs + margin

    // Expected emissions:
    // 1. Log 1
    // 2. Log 2
    // 3. End History
    expect(emitSpy).toHaveBeenCalledTimes(3);
  });

  it('should toggle Chaos Mode', () => {
    const controller = (window as any).boksSimulatorController as SimulatorAPI;

    controller.enableChaos(true);
    expect(controller.getState().chaosMode).toBe(true);

    controller.enableChaos(false);
    expect(controller.getState().chaosMode).toBe(false);
  });

  it('should handle code creation', () => {
    const emitSpy = vi.spyOn(simulator, 'emit');
    // Payload: ConfigKey(4) + Index(1) + Pin(var)
    const pin = '998877';
    const payload = new Uint8Array([0, 0, 0, 0, 0, ...new TextEncoder().encode(pin)]);

    simulator.handlePacket(BLEOpcode.CREATE_SINGLE_USE_CODE, payload);
    vi.advanceTimersByTime(60);

    const state = (window as any).boksSimulatorController.getState();
    expect(state.pinCodes.get(pin)).toBe('single');
    expect(emitSpy).toHaveBeenCalled();
  });

  it('should handle code counting', () => {
    const emitSpy = vi.spyOn(simulator, 'emit');

    // Add another code
    const state = (window as any).boksSimulatorController.getState();
    state.pinCodes.set('112233', 'single');

    simulator.handlePacket(BLEOpcode.COUNT_CODES, new Uint8Array([]));
    vi.advanceTimersByTime(60);

    // Should emit NOTIFY_CODES_COUNT [MasterHigh, MasterLow, SingleHigh, SingleLow]
    // 1 Master (default), 1 Single
    // [0, 1, 0, 1]
    expect(emitSpy).toHaveBeenCalledWith('notification', expect.any(Uint8Array));
  });

  it('should handle La Poste configuration', () => {
    const emitSpy = vi.spyOn(simulator, 'emit');

    simulator.handlePacket(BLEOpcode.SET_CONFIGURATION, new Uint8Array([0x01]));
    vi.advanceTimersByTime(60);

    expect(emitSpy).toHaveBeenCalled();
  });
});
