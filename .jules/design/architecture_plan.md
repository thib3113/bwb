# Architecture Plan: Offline Mode, Multi-Boks & Theme Fix

## 1. Theme Context Fix

**Problem:** The current theme implementation relies solely on `useMediaQuery` and does not persist user preference or allow manual overrides effectively.

**Solution:**
Create a dedicated `ThemeContext` that manages the theme state ('light', 'dark', 'system') and persists it to `localStorage`.

**Implementation Details:**
*   **File:** `src/context/ThemeContext.jsx`
*   **State:** `themeMode` (enum: 'light', 'dark', 'system')
*   **Storage Key:** `boks-theme-preference`
*   **Logic:**
    *   Initialize state from `localStorage`.
    *   If 'system', use `useMediaQuery` to determine actual palette mode.
    *   If 'light'/'dark', force that mode.
    *   Expose `toggleTheme` or `setThemeMode` to consumers.
*   **Integration:** Wrap `App` in `ThemeContextProvider` in `main.jsx`. Update `ConfigurationModal` to control this state.

## 2. Storage & Multi-Boks Support

**Problem:** `useLocalStorage` currently defaults to 'default' device ID. Data isn't effectively scoped to specific Boks devices, and there's no registry of "known devices" to browse offline.

**Solution:**
Implement a robust storage strategy keyed by a unique `boksId`.

**Storage Schema (localStorage):**
*   `boks-known-devices`: JSON Array of `{ id: string, name: string, lastConnected: timestamp }`
*   `boks-codes-{boksId}`: JSON Array of Code Objects (existing structure + `synced` flag)
*   `boks-logs-{boksId}`: JSON Array of Log Objects
*   `boks-pending-actions-{boksId}`: JSON Array of `{ type: 'ADD_CODE' | 'DELETE_CODE', payload: ... }`

**Device Identification:**
*   **`boksId`**: Derived from the BLE Device Name (e.g., "Boks_A1B2").
    *   *Note:* Web Bluetooth doesn't expose MAC addresses for privacy. We must rely on the advertised name or a characteristic value (like Serial Number if available in Device Info service). For now, we will use the **Device Name** as the primary ID.

## 3. Offline Mode & Device Context

**Problem:** The app currently assumes "Connected" or "Disconnected". There is no state for "Viewing data of Device X while disconnected".

**Solution:**
Introduce a `DeviceContext` that sits above the UI but consumes `BLEContext`.

**`DeviceContext` Responsibilities:**
1.  **Current Device State:** Holds `currentDeviceId` (string | null).
2.  **Mode Determination:**
    *   **Live Mode:** `BLEContext.isConnected` is true AND `BLEContext.device.name` matches `currentDeviceId`.
    *   **Offline Mode:** `currentDeviceId` is set BUT `BLEContext.isConnected` is false.
    *   **No Device:** `currentDeviceId` is null.
3.  **Device Registry:** Manages the `boks-known-devices` list. When a connection is successful, add/update the device in this list.

## 4. Pending Sync Mechanism

**Problem:** Users cannot create codes when offline.

**Solution:**
Queue actions when in Offline Mode and replay them when connection is established.

**Workflow:**
1.  **User Action:** User clicks "Add Code" while in Offline Mode.
2.  **Storage:**
    *   Create code object with `status: 'pending_sync'`.
    *   Save to `boks-codes-{boksId}` (so it appears in the list immediately).
    *   Add action to `boks-pending-actions-{boksId}` (for redundancy/queue management).
3.  **UI Feedback:** Show code in list with a "clock" icon or "Pending" badge. Disable "Delete" for pending codes (or allow local delete).
4.  **Sync Process (triggered on Connection):**
    *   `DeviceContext` detects connection.
    *   It fetches `boks-pending-actions-{boksId}`.
    *   **Loop:**
        *   Send BLE Command (e.g., `0x11` Create Master Code).
        *   Wait for Success Notification (`0x77`).
        *   **On Success:** Update code status to `synced` in `boks-codes-{boksId}`, remove from pending queue.
        *   **On Failure:** Update status to `error`, keep in queue (or move to 'failed' list).

## 5. Implementation Steps

1.  **Refactor Theme:** Implement `ThemeContext` and fix the UI toggle.
2.  **Refactor Storage:** Create `DeviceContext` to handle known devices and current device selection.
3.  **Update CodeManager:**
    *   Accept `boksId` from `DeviceContext`.
    *   Modify `handleAddCode` to handle both Online (direct BLE) and Offline (save pending) paths.
    *   Update UI to render pending states.
4.  **Implement Sync:** Add the sync logic in `DeviceContext` (or a `SyncHook`) that runs when `isConnected` becomes true.