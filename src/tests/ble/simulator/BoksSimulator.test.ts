import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BoksSimulator } from '../../../ble/simulator/BoksSimulator';
import { BLEOpcode, SIMULATOR_DEFAULT_PIN } from '../../../utils/bleConstants';

describe('BoksSimulator', () => {
  let simulator: BoksSimulator;

  beforeEach(() => {
    vi.useFakeTimers();
    simulator = BoksSimulator.getInstance();
  });

  afterEach(() => {
    simulator.reset();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should initialize with default state', () => {
    const state = simulator.getPublicState();
    expect(state.isOpen).toBe(false);
    expect(state.logs).toHaveLength(0);
    expect(state.pinCodes.get(SIMULATOR_DEFAULT_PIN)).toBe('master');
    expect(state.chaosMode).toBe(false);
  });

  it('should handle manual Open Door trigger', () => {
    const emitSpy = vi.spyOn(simulator, 'emit');

    simulator.triggerDoorOpen('nfc');

    expect(emitSpy).toHaveBeenCalledWith('notification', expect.any(Uint8Array));
    const state = simulator.getPublicState();
    expect(state.isOpen).toBe(true);
    expect(state.logs).toHaveLength(1);
    expect(state.logs[0].opcode).toBe(BLEOpcode.LOG_EVENT_NFC_OPENING);
  });

  it('should auto-close the door after delay', () => {
    simulator.triggerDoorOpen('button');

    expect(simulator.getPublicState().isOpen).toBe(true);

    // Fast-forward time (e.g., 20 seconds to be safe as delay is 5-15s)
    vi.advanceTimersByTime(20000);

    expect(simulator.getPublicState().isOpen).toBe(false);
    expect(simulator.getPublicState().logs).toHaveLength(2); // Open + Close
    expect(simulator.getPublicState().logs[1].opcode).toBe(BLEOpcode.LOG_DOOR_CLOSE_HISTORY);
  });

  it('should handle BLE Open Door packet', () => {
    const emitSpy = vi.spyOn(simulator, 'emit');
    // Mock valid code packet: '12345678' is SIMULATOR_DEFAULT_PIN
    const pin = SIMULATOR_DEFAULT_PIN;
    const payload = new TextEncoder().encode(pin);

    simulator.handlePacket(BLEOpcode.OPEN_DOOR, payload);

    // Response is async
    vi.advanceTimersByTime(60);

    // Expect VALID_OPEN_CODE notification
    expect(emitSpy).toHaveBeenCalled();

    // Check internal state "simulated delay"
    vi.advanceTimersByTime(1000);

    const state = simulator.getPublicState();
    expect(state.isOpen).toBe(true);
  });

  it('should reject invalid BLE code', () => {
    const payload = new TextEncoder().encode('00000000');
    simulator.handlePacket(BLEOpcode.OPEN_DOOR, payload);

    vi.advanceTimersByTime(60);

    const state = simulator.getPublicState();
    expect(state.isOpen).toBe(false);
  });

  it('should synthesize logs on request', () => {
    simulator.triggerDoorOpen('nfc');
    vi.advanceTimersByTime(20000); // Wait for auto-close

    // We have 2 logs
    expect(simulator.getPublicState().logs).toHaveLength(2);

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
    simulator.setChaosMode(true);
    expect(simulator.getPublicState().chaosMode).toBe(true);

    simulator.setChaosMode(false);
    expect(simulator.getPublicState().chaosMode).toBe(false);
  });

  it('should handle code creation', () => {
    const emitSpy = vi.spyOn(simulator, 'emit');
    // Payload: ConfigKey(4) + Index(1) + Pin(var)
    const pin = '998877';
    const payload = new Uint8Array([0, 0, 0, 0, 0, ...new TextEncoder().encode(pin)]);

    simulator.handlePacket(BLEOpcode.CREATE_SINGLE_USE_CODE, payload);
    vi.advanceTimersByTime(60);

    const state = simulator.getPublicState();
    expect(state.pinCodes.get(pin)).toBe('single');
    expect(emitSpy).toHaveBeenCalled();
  });

  it('should handle code counting', () => {
    const emitSpy = vi.spyOn(simulator, 'emit');

    // Add another code
    const state = simulator.getPublicState();
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

  // --- New Tests ---

  it('should emit disconnect event on simulation', () => {
    const emitSpy = vi.spyOn(simulator, 'emit');
    simulator.simulateDisconnect();
    expect(emitSpy).toHaveBeenCalledWith('disconnect-event');
  });

  it('should set and respect packet loss probability', () => {
    simulator.setPacketLoss(1); // 100% loss
    expect(simulator.getPacketLossProbability()).toBe(1);

    const emitSpy = vi.spyOn(simulator, 'emit');
    // Using a valid opcode like OPEN_DOOR with dummy payload
    // Normally handleOpenDoor would process this (even if payload is empty it runs)
    simulator.handlePacket(BLEOpcode.OPEN_DOOR, new Uint8Array([]));

    vi.advanceTimersByTime(100);
    // Should NOT emit notification because packet was dropped
    expect(emitSpy).not.toHaveBeenCalledWith('notification', expect.any(Uint8Array));

    // Reset loss
    simulator.setPacketLoss(0);

    // Valid packet
    const pin = SIMULATOR_DEFAULT_PIN;
    const payload = new TextEncoder().encode(pin);
    simulator.handlePacket(BLEOpcode.OPEN_DOOR, payload);

    vi.advanceTimersByTime(2000); // Wait enough
    // Should emit notification (VALID_OPEN_CODE)
    expect(emitSpy).toHaveBeenCalledWith('notification', expect.any(Uint8Array));
  });

  it('should allow custom packet handlers', () => {
    const emitSpy = vi.spyOn(simulator, 'emit');
    const customHandler = vi.fn().mockReturnValue(false); // Stop standard processing
    simulator.registerCustomHandler(BLEOpcode.OPEN_DOOR, customHandler);

    simulator.handlePacket(BLEOpcode.OPEN_DOOR, new Uint8Array([1, 2, 3]));
    vi.advanceTimersByTime(100);

    expect(customHandler).toHaveBeenCalledWith(new Uint8Array([1, 2, 3]));
    // Standard logic suppressed -> no notification emitted by simulator
    expect(emitSpy).not.toHaveBeenCalledWith('notification', expect.any(Uint8Array));
  });

  it('should inject logs', () => {
    simulator.injectLog(0x99, [1, 2, 3, 4]);
    const state = simulator.getPublicState();
    expect(state.logs).toHaveLength(1);
    expect(state.logs[0].opcode).toBe(0x99);
    expect(state.logs[0].payload).toEqual([1, 2, 3, 4]);
  });

  it('should update and emit RSSI', () => {
    const emitSpy = vi.spyOn(simulator, 'emit');
    simulator.setRssi(-80);
    expect(simulator.getPublicState().rssi).toBe(-80);
    expect(emitSpy).toHaveBeenCalledWith('rssi-update', -80);
  });
});
