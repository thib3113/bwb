# Hardware Specificities & Workarounds

**WARNING:** The Boks firmware has several non-standard behaviors. Failing to handle these will result in an unstable application.

## 1. Battery Reading: Two Endpoints
The Boks exposes two battery characteristics, and they behave very differently.

**A. Standard Service (`0x180F` -> `0x2A19`)**
*   **Reliability:** High.
*   **Data:** Returns a simple percentage (0-100%).
*   **Usage:** Use this for the main battery display in the UI.

**B. Proprietary Characteristic (`...0004`)**
*   **Reliability:** **Low / Conditional**.
*   **Behavior:** This characteristic often returns invalid data (e.g., all bytes `0xFF`) if the device has been idle.
*   **Activation:** It typically only populates with valid detailed stats (voltage, temperature history) **immediately after a door event** (Open/Close).
*   **Parsing Logic:**
    *   If `Byte[0] == 0xFF`: Data is invalid/stale. Ignore it.
    *   If `Length == 6`: Detailed stats (`Level`, `Min`, `Mean`, `Max`, `Last`, `Temp`).
    *   If `Length == 4`: Summary stats (`Level`, `T1`, `T5`, `T10`).
    *   **Temperature:** `RawValue - 25` (Celsius).

## 2. Flash Write Busy State
**Behavior:** Whenever a door event occurs (Open or Close), the hardware writes to internal flash.
**Consequence:** The CPU is busy.
**Recommendation:** While a strict 5-second lockout is not mandatory, be aware that command responsiveness will be degraded during this time. Avoid auto-triggering heavy tasks (like full Log Sync) *immediately* (< 1s) after a Door Close event.

## 3. Log Count Instability
**Behavior:** When `GET_LOGS_COUNT` is sent, the device often sends a preliminary response of `0`, followed quickly by the actual count.
**The Workaround:**
*   **Stabilization:** When receiving `LOGS_COUNT (0x79)`, wait a short window (~200ms).
*   **Selection:** If multiple updates arrive, always use the **highest** value.

## 4. Single-Connection Constraint
**Behavior:** The Boks supports exactly **one** active BLE connection.
**The Workaround:**
*   **Aggressive Disconnect:** If the user minimizes the app or turns off the screen, `disconnect()` immediately. Holding the connection prevents physical keys or other users from operating the box.