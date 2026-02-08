# Boks Protocol Specifications

This document defines the low-level communication protocol for the Boks hardware.

## 1. Bluetooth Low Energy Profile

**Service UUID:** `a7630001-f491-4f21-95ea-846ba586e361`

| Characteristic | UUID | Properties | Description |
| :--- | :--- | :--- | :--- |
| **Command** | `a7630002-f491-4f21-95ea-846ba586e361` | Write | Send commands to the device (Downlink). |
| **Notification** | `a7630003-f491-4f21-95ea-846ba586e361` | Notify | Receive events and responses (Uplink). |
| **Battery (Adv)** | `00000004-0000-1000-8000-00805f9b34fb` | Read | **Proprietary Stats** (Volatile - see Quirks). |

*Standard Services:*
- **Battery Service (Standard):** `0x180F` -> Level `0x2A19` (Reliable %).
- **Device Info:** `0x180A`.

## 2. Packet Construction

### Downlink (Client -> Boks)
*   **Format:** `[Opcode, ...Payload]`
*   **Authentication:** Sensitive commands (PINs, NFC, Settings) require `config_key` (8-char ASCII) in the payload.
*   **Checksum:** `Sum(All Bytes) & 0xFF`.

### Uplink (Boks -> Client)
*   **Format:** `[Opcode, ...Data]`
*   **Asynchronous Nature:** Be aware that the Boks sends notifications **spontaneously**.
    *   *Example:* Upon connection or status change, it may send `CODES_COUNT` or `LOGS_COUNT` without a direct request.

## 3. Command Registry (Downlink)

| Hex Opcode | Name              | Description                  | Payload Arguments          |
|:-----------|:------------------|:-----------------------------|:---------------------------|
| `0x01`     | `OPEN_DOOR`       | Unlock request               | `[PIN_CODE]`               |
| `0x02`     | `ASK_DOOR_STATUS` | Query state                  | None                       |
| `0x03`     | `REQUEST_LOGS`    | Start Log stream         | None                       |
| `0x07`     | `GET_LOGS_COUNT`  | Query log quantity           | None                       |
| `0x0C`     | `DELETE_MASTER`   | Remove master PIN            | `[ConfigKey, Index]`       |
| `0x0D`     | `DELETE_SINGLE`   | Remove 1-use PIN             | `[ConfigKey, Code]`        |
| `0x0E`     | `DELETE_MULTI`    | Remove multi PIN             | `[ConfigKey, Code]`        |
| `0x11`     | `CREATE_MASTER`   | Add master PIN               | `[ConfigKey, Index, Code]` |
| `0x12`     | `CREATE_SINGLE`   | Add 1-use PIN                | `[ConfigKey, Code]`        |
| `0x13`     | `CREATE_MULTI`    | Add multi PIN                | `[ConfigKey, Code]`        |
| `0x14`     | `COUNT_CODES`     | Stats on active PINs         | None                       |
| `0x16`     | `SET_CONFIG`      | Change settings              | `[ConfigKey, Type, Value]` |
| `0x17`     | `NFC_SCAN_START`  | **Required** before Register | `[ConfigKey]`              |
| `0x18`     | `NFC_REGISTER`    | Bind UID (Must scan first)   | `[ConfigKey, UID_Bytes]`   |
| `0x19`     | `NFC_UNREGISTER`  | Remove UID                   | `[ConfigKey, UID_Bytes]`   |

### Configuration Types (`SET_CONFIG 0x16`)
| Type (Hex) | Description             | Value (Hex)                        |
|:-----------|:------------------------|:-----------------------------------|
| **`0x01`** | **Scan La Poste / PTT** | `0x01` (Enable) / `0x00` (Disable) |

## 4. Notification Registry (Uplink)

| Hex Opcode | Name                    | Description                         |
|:-----------|:------------------------|:------------------------------------|
| `0x77`     | `CODE_OPERATION_SUCCESS`| Command acknowledged                |
| `0x78`     | `CODE_OPERATION_ERROR`  | Command failed                      |
| `0x79`     | `NOTIFY_LOGS_COUNT`     | Response to `0x07` (or spontaneous) |
| `0x81`     | `VALID_OPEN_CODE`       | Door is opening                     |
| `0x82`     | `INVALID_OPEN_CODE`     | PIN was incorrect                   |
| `0x84`     | `NOTIFY_DOOR_STATUS`    | Auto-update: State changed          |
| `0x85`     | `ANSWER_DOOR_STATUS`    | Response to `0x02`                  |
| `0x92`     | `LOG_END`           | Log stream finished             |
| `0xC3`     | `NOTIFY_CODES_COUNT`    | Response to `0x14` (or spontaneous) |
| `0xC5`     | `NFC_TAG_REGISTER_SCAN_RESULT` | Tag scanned by reader        |
| `0xE1`     | `ERROR_UNAUTHORIZED`    | Wrong `config_key`                  |
| `0xE2`     | `ERROR_BAD_REQUEST`     | Malformed packet                    |

### 4.1 Notification Details (Uplink Payloads)

| Opcode | Payload Structure | Description |
|:-------|:------------------|:------------|
| `0x79` | `[Len=02, Count(2)]` | **NOTIFY_LOGS_COUNT**: Count is uint16 BE. `Len` is payload length. |
| `0xC3` | `[Len=07, Master(2), Other(2)]` | **NOTIFY_CODES_COUNT**: Counts are uint16 BE. **WARNING**: `Len` is **Total Packet Length** (7). |
| `0x84` | `[Len, Status, ...]` | **NOTIFY_DOOR_STATUS**: Detailed door/lock status. |

## 5. Log Event Opcodes (Log Stream)
When `REQUEST_LOGS` (`0x03`) is active, the device streams these events.

| Hex    | Event Name       | Meaning                     |
|:-------|:-----------------|:----------------------------|
| `0x90` | `DOOR_CLOSED`    | Physical door closed sensor |
| `0x91` | `DOOR_OPENED`    | Physical door open sensor   |
| `0x86` | `CODE_BLE_VALID` | Unlock via App (Bluetooth)  |
| `0x87` | `CODE_KEY_VALID` | Unlock via Keypad (PIN)     |
| `0xA1` | `NFC_OPENING`    | Unlock via NFC Tag          |
| `0x94` | `POWER_OFF`      | System Shutdown / Reboot    |
| `0x96` | `POWER_ON`       | System Startup              |
| `0x97` | `BLE_REBOOT`     | BLE Module Reset            |
| `0xA2` | `NFC_TAG_SCAN`   | NFC Registration Event      |
| `0x99` | `KEY_OPENING`    | Mechanical Key Used         |
| `0xA0` | `ERROR`          | Diagnostic/System Error     |
