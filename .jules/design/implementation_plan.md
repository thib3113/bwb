# Implementation Plan: Offline Mode & Theme Fix

## Phase 1: Theme Context Fix

1.  **Create `src/context/ThemeContext.jsx`**:
    *   Implement `ThemeContextProvider` with `themeMode` state.
    *   Use `useLocalStorage` (or direct `localStorage`) to persist preference.
    *   Provide `toggleTheme` and `setThemeMode` functions.
    *   Generate the MUI theme based on `themeMode` (using `createTheme`).
2.  **Update `src/main.jsx`**:
    *   Replace `useAppTheme` usage with `ThemeContextProvider`.
    *   Wrap `App` with `ThemeContextProvider`.
3.  **Update `src/components/ConfigurationModal.jsx`**:
    *   Consume `ThemeContext`.
    *   Bind the Theme selector to `setThemeMode`.
4.  **Delete `src/theme.js`**:
    *   Move logic into `ThemeContext.jsx` or keep as a utility called by the context.

## Phase 2: Device Context & Storage

1.  **Create `src/context/DeviceContext.jsx`**:
    *   **State**: `currentDeviceId`, `knownDevices` (array).
    *   **Hooks**: Use `useLocalStorage` to persist `knownDevices`.
    *   **Logic**:
        *   `selectDevice(id)`: Sets `currentDeviceId`.
        *   `addDevice(device)`: Adds to `knownDevices` if new.
        *   `updateDeviceStatus(id, status)`: Updates last seen/connected info.
    *   **Integration**: Wrap `App` in `DeviceContextProvider`.
2.  **Update `src/hooks/useLocalStorage.js`**:
    *   Ensure it handles dynamic keys correctly (it already accepts a key, but we need to ensure consumers pass the *scoped* key).
    *   *Refinement:* Actually, `useLocalStorage` takes a `deviceId` arg. We just need to ensure components pass the *correct* `deviceId` from `DeviceContext`.

## Phase 3: Offline Mode & Code Management

1.  **Update `src/components/CodeManager.jsx`**:
    *   Consume `DeviceContext` to get `currentDeviceId`.
    *   **Read**: Load codes using `useLocalStorage('boks-codes', [], currentDeviceId)`.
    *   **Write (Add Code)**:
        *   If `isConnected`: Send BLE command. On success, save to storage with `synced: true`.
        *   If `!isConnected`: Save to storage with `synced: false` (pending).
    *   **UI**:
        *   Display "Pending" indicator for unsynced codes.
        *   Disable "Delete" for pending codes (or implement local delete).
2.  **Update `src/components/ConnectionManager.jsx`**:
    *   When connected, call `DeviceContext.addDevice(device)`.
    *   Show "Offline Mode" indicator when viewing a device but not connected.

## Phase 4: Sync Mechanism

1.  **Implement Sync Logic in `DeviceContext`**:
    *   `useEffect` watching `isConnected`.
    *   When `isConnected` becomes `true`:
        *   Load pending codes for `currentDeviceId`.
        *   Iterate and send BLE commands.
        *   Update storage on success.
        *   Show notification "Synced X pending codes".

## Phase 5: Testing

1.  **Theme**: Toggle theme, reload page, verify persistence.
2.  **Offline**:
    *   Disconnect.
    *   Add a code. Verify it appears as "Pending".
    *   Reload page. Verify code remains.
3.  **Sync**:
    *   Connect to device.
    *   Verify pending code is sent (check logs/device).
    *   Verify UI updates to "Synced".