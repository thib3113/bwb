# Boks Logic & Workflows

This document defines the high-level logic and state machines required to implement Boks features in a Web UI.

## 1. Initial Connection & "Spontaneous" Data
*   **Startup:**
    1.  Connect to GATT and Subscribe to Notifications (`...0003`).
    2.  **Spontaneous Packets:** The Boks often sends `NOTIFY_CODES_COUNT` (`0xC3`) or `NOTIFY_LOGS_COUNT` (`0x79`) spontaneously upon connection. Update your UI state globally when these arrive.

## 2. Door Control Workflow
*   **Action:** Send `OPEN_DOOR (0x01)` + `PIN_CODE`.
*   **Success:** `VALID_OPEN_CODE (0x81)` -> Wait for `0x91` (Door Opened).

## 3. History Synchronization Workflow
1.  **Request Count:** Send `GET_LOGS_COUNT (0x07)`.
2.  **Stabilization:** Wait ~200ms for potentially multiple `0x79` notifications. Take the **maximum** value.
3.  **Request Data:** If Count > 0, send `REQUEST_LOGS (0x03)`.
4.  **Streaming:** Process until `END_HISTORY (0x92)` is received. Calculate event time: `Date.now() - (PacketAge * 1000)`.

## 4. NFC Badge Registration (Strict Sequence)
Registration will fail unless the tag has been scanned during the same active session.
1.  **Step 1 (Scan):** Send `NFC_SCAN_START (0x17)` + `config_key`.
2.  **Step 2 (Detection):** Wait for `NFC_TAG_REGISTER_SCAN_RESULT (0xC5)`. Extract the `UID`.
3.  **Step 3 (Register):** Send `NFC_REGISTER (0x18)` + `config_key` + `UID`.
4.  **Confirmation:** Wait for `CODE_OPERATION_SUCCESS (0x77)`.

## 5. Device Configuration: "Mode La Poste"
Currently, this is the only use case for the `SET_CONFIG` command. It allows enabling or disabling the box's ability to be opened by PTT/La Poste NFC badges.

1.  **Action:** Send `SET_CONFIG (0x16)`.
2.  **Arguments:**
    *   `Type`: `0x01` (Scan La Poste Tags).
    *   `Value`: `0x01` (Enable) or `0x00` (Disable).
3.  **Authentication:** Requires `config_key` in the payload.
4.  **Wait For:** `CODE_OPERATION_SUCCESS (0x77)`.

## 6. PIN Management
1.  **Creation:** Send `CREATE_...` opcode + `config_key` + `code`.
2.  **Deletion:** Send `DELETE_...` opcode + `config_key` + `code`.
3.  **Wait For:** `CODE_OPERATION_SUCCESS (0x77)`.
