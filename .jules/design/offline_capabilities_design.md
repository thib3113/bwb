# Offline Capabilities & Settings Architecture Design

## 1. Overview
This document outlines the architecture for adding offline capabilities, action queuing, and global settings to the Boks Web BLE application.

## 2. Global Settings
A new `SettingsContext` will be created to manage application-wide settings.

### 2.1 Storage Schema
Settings will be stored in `localStorage` under the key `boks_global_settings`.

```json
{
  "autoImport": boolean, // Default: false
  "configurationKey": string, // Default: ""
  "theme": string // Managed separately by ThemeContext, but conceptually part of settings
}
```

### 2.2 SettingsContext API
```javascript
export const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    autoImpor: false,
    configurationKey: ''
  });

  // Load from localStorage on mount
  // Save to localStorage on change

  const updateSetting = (key, value) => { ... };

  return (
    <SettingsContext.Provider value={{ settings, updateSetting }}>
      {children}
    </SettingsContext.Provider>
  );
};
```

## 3. Offline Action Queue (State Synchronization)
Instead of a separate action queue, we will use a "Desired State" model within the existing `codes` list. This simplifies state management and UI updates.

### 3.1 Code Status Schema
The `status` field in the code object will be expanded:
- `synced`: Code exists on device and matches local state.
- `pending_add`: Code created locally but not yet sent to device.
- `pending_delete`: Code marked for deletion but not yet removed from device.
- `error`: Last operation failed.

### 3.2 StorageService Updates
- `saveCodes(boksId, codes)`: Persists the full list including pending items.
- `getPendingActions(boksId)`: Helper to filter codes with `pending_add` or `pending_delete`.

## 4. Sync Logic
Synchronization will be handled by `BLEContext` upon connection.

### 4.1 Sync Process (`syncPendingActions`)
1.  **Trigger**: Called automatically when `isConnected` becomes `true`.
2.  **Fetch**: Retrieve `codes` for the current `device.id` via `StorageService`.
3.  **Filter**: Identify codes with `pending_add` or `pending_delete`.
4.  **Execute**:
    *   **For `pending_add`**:
        *   Send `ADD_CODE` command (opcode `0x03` or similar).
        *   If success: Update status to `synced`.
        *   If fail: Update status to `error` (or keep `pending` with retry count).
    *   **For `pending_delete`**:
        *   Send `DELETE_CODE` command.
        *   If success: Remove code from local storage entirely.
        *   If fail: Update status to `error`.
5.  **Update Storage**: Save the updated codes list after each operation or batch.
6.  **Notify UI**: `CodeManager` will reflect changes via `StorageService` reload or context update.

## 5. Automatic Import Flow
1.  **Trigger**: Inside `BLEContext`'s `connect` function, after successful connection.
2.  **Check**: Read `autoImport` from `SettingsContext` (or direct localStorage read to avoid circular dependency if context is tricky inside `connect`).
3.  **Action**: If true, call `requestLogs()` (needs implementation in `BLEContext`).
4.  **UI**: Show a toast/notification "Auto-importing logs...".

## 6. UI Updates (CodeManager)
- **Add Code**:
    - If offline: Add to list with `status: 'pending_add'`.
    - If online: Add to list with `status: 'pending_add'`, then trigger sync immediately.
- **Delete Code**:
    - If offline: Update status to `pending_delete`.
    - If online: Update status to `pending_delete`, then trigger sync immediately.
- **Visuals**:
    - `pending_add`: Show with "Sync Pending" icon/chip (Yellow).
    - `pending_delete`: Show with "Deletion Pending" style (Strikethrough + Red Chip).
    - `error`: Show error icon/tooltip.

## 7. Implementation Plan

### Step 1: Settings Infrastructure
- Create `src/context/SettingsContext.jsx`.
- Wrap `App` with `SettingsProvider`.
- Create `src/components/SettingsModal.jsx` to toggle "Auto Import" and set "Configuration Key".

### Step 2: Storage & Logic Updates
- Update `StorageService.js` to handle the new status types if needed (mostly logic in components).
- Implement `syncPendingActions` in `BLEContext.jsx`.
- Implement `requestLogs` in `BLEContext.jsx` (if not present).

### Step 3: UI Integration
- Update `CodeManager.jsx` to handle `pending_add` and `pending_delete` states.
- Add "Settings" button to `Header.jsx` or `MainLayout.jsx`.

### Step 4: Auto Import
- Hook `syncPendingActions` and `autoImport` check into `BLEContext` connection flow.
