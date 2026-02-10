# Offline Multi-Device & Settings Management Plan

## Overview

This plan addresses the requirement for offline multi-device support and robust settings management. Users will be able to view data for previously connected devices and manage global application settings with a "Draft -> Save" workflow.

## 1. Architecture Changes

### 1.1 DeviceContext Refactor (`src/context/DeviceContext.jsx`)

The `DeviceContext` will evolve from a simple state holder to a robust manager of device metadata.

- **State:**
  - `knownDevices`: `Array<{ id: string, name: string, lastSeen: number }>` (Persisted in `localStorage`)
  - `activeDeviceId`: `string | null` (Persisted in `localStorage` as 'lastActiveDeviceId')
- **Actions:**
  - `registerDevice(bleDevice)`: Called upon successful BLE connection.
    - Extracts ID and Name.
    - Updates `knownDevices`:
      - If ID exists: Update `lastSeen`. Keep existing `name` (user alias) unless it was never set.
      - If ID new: Add to array with default name.
    - Sets `activeDeviceId` to this ID.
  - `updateDeviceName(id, newName)`: Updates the alias for a specific device.
  - `removeDevice(id)`: Removes device from `knownDevices` and clears associated data via `StorageService`.
  - `setActiveDevice(id)`: Switches the current view to the specified device.
- **Derived Values:**
  - `activeDevice`: The full metadata object from `knownDevices` matching `activeDeviceId`.

### 1.2 Settings Management

- **Global Settings:**
  - Theme (System/Light/Dark) - Managed by `ThemeContext`.
  - Language (EN/FR) - Managed by `i18n`.
- **Device Settings:**
  - Aliases - Managed by `DeviceContext`.
- **Workflow:**
  - The `ConfigurationModal` will maintain a local "draft" state of all settings.
  - Changes are only applied to the respective Contexts/Services when "Save" is clicked.

## 2. Component Updates

### 2.1 ConfigurationModal (`src/components/ConfigurationModal.jsx`)

- **Remove:**
  - Single "Device Name" input.
  - "Auto Connect" toggle (per user feedback).
  - "Notifications" toggle (per user feedback).
- **Add:**
  - **Known Devices List:**
    - List of all devices from `knownDevices`.
    - Editable Text Field for "Name/Alias".
    - "Forget" (Delete) button for each.
  - **Language Selector:** (Already exists, ensure it's part of the draft state).
- **Logic:**
  - `useEffect` to load current values from Contexts into local state on open.
  - `handleSave`:
    - Call `setThemeMode`.
    - Call `i18n.changeLanguageAndStore`.
    - Call `updateDeviceName` for each modified device.
    - Call `removeDevice` for any deleted devices.

### 2.2 Header (`src/components/layout/Header.jsx`)

- **Add Device Selector:**
  - A Dropdown (Select) appearing in the Toolbar.
  - **Condition:** Only visible if `knownDevices.length > 1`.
  - Shows `activeDevice.name` or "Select Device".
  - Options: List of `knownDevices`.
  - Visual indicator (e.g., Green dot) if the selected device is currently _connected_ via BLE.

### 2.3 StorageService (`src/services/StorageService.js`)

- **Add:** `clearDeviceData(id)` method to remove `boks_${id}_codes` and `boks_${id}_logs`. (Already exists, just verify usage).

### 2.4 useBLE Hook (`src/hooks/useBLE.js`)

- **Integration:** Ensure that upon connection, it calls `DeviceContext.registerDevice()`.

## 3. Implementation Steps

1.  **Refactor `DeviceContext`**: Implement the new state structure and actions.
2.  **Update `StorageService`**: Ensure cleanup methods are ready.
3.  **Update `ConfigurationModal`**: Redesign the UI to match the new requirements (remove unused, add device list).
4.  **Update `Header`**: Add the device selector with the conditional visibility logic.
5.  **Verify `CodeManager` & `LogViewer`**: Ensure they rely on `activeDeviceId` from `DeviceContext` to fetch data, rather than a direct BLE object dependency for rendering.

## 4. Todo List

- [x] Refactor `DeviceContext.jsx`
- [x] Update `ConfigurationModal.jsx` (Cancelled: Device settings moved to "My Boks" section)
- [x] Update `Header.jsx`
- [x] Verify `useBLE` integration
- [ ] Test Offline Switching
