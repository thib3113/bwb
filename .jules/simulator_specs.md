# Boks Device Simulator Specifications

This document defines the behavior of a "Virtual Boks" for testing purposes. Ideally, the simulator should be implemented as a class (`BoksSimulator`) that the BLE Adapter can talk to.

## 1. Core State
The simulator must maintain an internal state that persists during a session.

```typescript
interface SimulatorState {
  connected: boolean;
  authenticated: boolean; // True after any command with valid config_key? Or just context?
  configKey: string;      // The "real" key of the virtual device (e.g., "12345678")

  // Data
  codes: Array<{ type: 'master'|'single'|'multi', code: string, index?: number }>;
  logs: Array<LogEntry>;
  nfcTags: Array<string>; // UIDs
  
  // Hardware State
  doorState: 'open' | 'closed';
  batteryLevel: number; // 0-100
  macAddress: string;
}
```

## 2. Protocol Behavior

### General Packet Structure
*   **Downlink (App -> Sim):** `[Opcode, Length, ...Payload, Checksum]`
*   **Uplink (Sim -> App):** `[Opcode, Length, ...Payload, Checksum]`

### The "Length" Quirk (CRITICAL)
The simulator **MUST** reproduce the firmware's inconsistent length calculation to ensure the App parses it correctly.

*   **Standard Rule:** `Length` byte = Size of **Payload** only.
    *   Used by: `NOTIFY_LOGS_COUNT (0x79)`, `VALID_OPEN_CODE (0x81)`, `INVALID_OPEN_CODE (0x82)`, `CODE_OPERATION_SUCCESS (0x77)`, `CODE_OPERATION_ERROR (0x78)`...
*   **Exception Rule:** `Length` byte = **Total Packet Size**.
    *   Used by: **`NOTIFY_CODES_COUNT (0xC3)`**.
    *   *Format:* `[0xC3, 0x07, M_MSB, M_LSB, O_MSB, O_LSB, CS]`

## 3. Command Handlers

### Connection / Disconnection
*   **On Connect:**
    *   Send spontaneous `NOTIFY_CODES_COUNT (0xC3)` notification after ~500ms.
    *   Send spontaneous `NOTIFY_LOGS_COUNT (0x79)` notification after ~600ms.
    *   *Why?* Real hardware does this. The App relies on it to update badges.

### `OPEN_DOOR (0x01)`
*   **Input:** PIN Code (ASCII).
*   **Logic:** Check if code exists in `state.codes`.
*   **Response:**
    *   Immediately: `VALID_OPEN_CODE (0x81)` or `INVALID_OPEN_CODE (0x82)`.
    *   If Valid: Trigger a `NOTIFY_DOOR_STATUS (0x84)` with "Open" state.

### `GET_LOGS_COUNT (0x07)`
*   **Response:** `NOTIFY_LOGS_COUNT (0x79)`.
*   **Payload:** `[Count_MSB, Count_LSB]`.
*   **Length Byte:** 2 (Standard).

### `COUNT_CODES (0x14)`
*   **Response:** `NOTIFY_CODES_COUNT (0xC3)`.
*   **Payload:** `[Master_MSB, Master_LSB, Other_MSB, Other_LSB]`.
*   **Length Byte:** **7** (Exception!).

### `REQUEST_LOGS (0x03)`
*   **Behavior:** Stream the logs from `state.logs`.
*   **Format:** One notification per log entry.
*   **Speed:** Send one packet every ~50ms to simulate BLE throughput.
*   **End:** Send `END_HISTORY (0x92)` when finished.

### `SET_CONFIGURATION (0x16)`
*   **Logic:** Update internal flags (e.g., La Poste Scanning).
*   **Response:** `CODE_OPERATION_SUCCESS (0x77)` or `CODE_OPERATION_ERROR (0x78)`.

### CRUD Operations (0x09 - 0x13)
*   **Logic:** Add/Delete/Modify `state.codes`.
*   **Response:**
    *   Standard: `CODE_OPERATION_SUCCESS (0x77)` or `CODE_OPERATION_ERROR (0x78)`.
    *   **Quirk `CREATE_SINGLE_USE_CODE (0x12)`:** This command **always** returns `CODE_OPERATION_ERROR (0x78)` in the firmware, even when the code is successfully created. The simulator must replicate this to test App-side workarounds.
*   *Side Effect:* Trigger a `NOTIFY_CODES_COUNT (0xC3)` update to the App.

## 4. Simulator Control & Logic Consistency

The simulator must maintain a coherent internal history and state, even when subjected to rapid or "impossible" commands. It supports manual triggers (Playwright/Console) and an optional "Chaos Mode" (Autonomous behavior).

### Logical Consistency & History Synthesis
1.  **State Mutual Exclusion:**
    *   A door cannot be opened if it is already `open`. Subsequent "Open" commands during this state will return `VALID_OPEN_CODE` but will NOT trigger new notifications or logs.
2.  **Auto-Close:**
    *   Any opening event (BLE, NFC, Physical) triggers an automatic closing sequence after a delay (e.g., 5s to 30s). The sequence MUST be: `NOTIFY(Open) -> Log(Open) -> ... Delay ... -> Log(Close) -> NOTIFY(Closed)`.
3.  **Log Synthesis (The "Time Travel" Rule):**
    *   The simulator does not need strict real-time debouncing.
    *   When the App requests logs (`REQUEST_LOGS`), the simulator can synthesize a logical history.
    *   *Example:* If the user triggers 3 openings in 1 second via the console, the simulator should record them with plausible timestamps (at least 2-5s apart) or merge them into a single coherent sequence (Open -> Close -> Open).

### Control Interface (DevTools & API)

A dedicated **Simulator Tab** should be added to the App's DevTools/Debug menu.

#### A. Chaos Mode (Automatic)
*   **Behavior:** When enabled, the simulator periodically triggers random events (NFC opening, battery drops, vibration).
*   **Toggle:** A "Chaos Mode" checkbox in the UI or `setChaosMode(true/false)` in the API.
*   **Purpose:** Test the App's background reactivity during manual exploration.

#### B. Manual Control (Playwright & Debugging)
*   **Behavior:** The simulator only acts on BLE commands or explicit triggers.
*   **UI Buttons:** "Open (BLE)", "Open (NFC)", "Low Battery", "Clear Logs".

### Exposed API (`window.boksSimulatorController`)
```typescript
interface SimulatorAPI {
  // Behavior Config
  enableChaos(enabled: boolean): void;
  setBatteryLevel(level: number): void;

  // Triggers
  triggerDoorOpen(source: 'ble' | 'nfc' | 'button', code?: string): void;
  triggerDoorClose(): void;

  // State
  reset(): void; // Clear logs and reset to default codes
  getState(): SimulatorState;
}
```

## 5. Error Simulation (Optional)
To test App robustness, the simulator can optionally:
*   Send malformed checksums.
*   Drop packets (simulate packet loss).
*   Send `ERROR_CRC (0xE0)` or `BAD_REQUEST (0xE2)`.
