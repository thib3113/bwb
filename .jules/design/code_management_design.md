# Enhanced Code Management & Settings Design

## 1. Overview

This document outlines the architecture for the enhanced Code Management features, including a new creation flow with validation, a categorized list view, and integration with log data for usage tracking. It also covers the addition of a "Door PIN Code" setting.

## 2. Data Structures

### 2.1 Code Object Updates

The `Code` object in `localStorage` (`boks_{id}_codes`) remains largely the same but will be utilized more fully.

```javascript
{
  id: number,           // Timestamp (Unique ID for React keys)
  code: string,         // The actual PIN code
  type: 'master' | 'single' | 'multi',
  index: number,        // 0-255 (Required for Master codes)
  description: string,  // User description
  date: string,         // Creation date (ISO string)
  status: 'synced' | 'pending_add' | 'pending_delete' | 'error',
  // Note: 'used' and 'lastUsed' are derived from logs at runtime, not necessarily stored here,
  // though caching them is an option if performance becomes an issue.
}
```

### 2.2 Settings Object Updates

The global settings in `SettingsContext` (`boks_global_settings`) will be updated.

```javascript
{
  autoImport: boolean,
  configurationKey: string,
  doorPinCode: string // NEW: Default PIN code for the door (or similar usage)
}
```

## 3. Component Architecture

### 3.1 `CodeManager.jsx` (Refactor)

The main container component.

- **State**:
  - `codes`: Array (from `StorageService`).
  - `logs`: Array (from `StorageService`).
  - `isAddDialogOpen`: Boolean.
- **Render**:
  - **Header**: Title + "Add" Floating Action Button (FAB).
  - **Accordion 1**: "Permanent Codes (Master)"
    - Renders `CodeList` filtered by `type === 'master'`.
  - **Accordion 2**: "Single Use Codes"
    - Renders `CodeList` filtered by `type === 'single'`.
- **Logic**:
  - `deriveCodeMetadata(code)`:
    - Scans `logs` to find usage.
    - **Master**: Finds most recent log entry matching this code's index. Returns `lastUsedDate`.
    - **Single**: Finds any log entry matching this code (if identifiable) after creation date. Returns `isUsed` and `usedDate`.

### 3.2 `AddCodeDialog.jsx` (New Component)

A dedicated modal for creating codes.

- **Props**:
  - `open`: boolean
  - `onClose`: function
  - `onSave`: function(codeData, overwriteId?)
  - `existingMasterIndices`: Array<number> (to calculate default index and detect conflicts)
- **State**:
  - `type`: 'master' | 'single'
  - `code`: string
  - `description`: string
  - `index`: number (for Master)
- **Logic**:
  - **Configuration Key Check**:
    - Read `configurationKey` from `SettingsContext`.
    - If missing: Display `Alert` (Severity: Warning) - "Configuration Key missing. Code will be saved locally for information purposes only."
  - **Master Code Index**:
    - **Default Value**: `Math.max(...existingMasterIndices, -1) + 1`.
    - **Conflict Detection**:
      - On "Save", check if `index` exists in `existingMasterIndices`.
      - If exists: Show confirmation dialog "Index {n} is already used. Overwrite?".
      - If confirmed: Pass `overwriteId` (ID of the old code) to `onSave`.

### 3.3 `SettingsModal.jsx` (Update)

- Add `TextField` for "Door PIN Code".
- Persist to `SettingsContext`.

## 4. Logic Flows

### 4.1 Code Creation & Conflict Resolution

1.  User opens `AddCodeDialog`.
2.  User selects "Master Code".
3.  Dialog calculates next available index (e.g., 3).
4.  User changes index to 1 (which already exists).
5.  User clicks "Save".
6.  Dialog detects conflict with Code A (Index 1).
7.  Dialog shows "Overwrite Code A?".
8.  User confirms.
9.  `CodeManager` receives `onSave(newCode, overwriteId=CodeA.id)`.
10. `CodeManager` performs atomic update:
    - Mark Code A as `pending_delete`.
    - Add New Code as `pending_add`.
    - (If connected) Trigger Sync.

### 4.2 Log Correlation

- **Goal**: Show "Last Used: [Date]" for Master Codes and "Used: [Date]" for Single Use.
- **Mechanism**:
  - `CodeManager` loads logs via `StorageService.loadLogs(deviceId)`.
  - **Master Codes**:
    - Filter logs for `event_type === 'PIN_CODE_OPEN'`.
    - Check if log data contains the code index.
    - Find the most recent timestamp.
  - **Single Use Codes**:
    - Filter logs for `event_type === 'SINGLE_USE_OPEN'`.
    - (Limitation: If logs don't contain the specific code, we might only be able to show "Used" if a single-use code was used _after_ this code was created, which is a heuristic).

## 5. Implementation Steps

1.  **Update `SettingsContext`**: Add `doorPinCode`.
2.  **Create `AddCodeDialog`**: Implement the form, validation, and conflict logic.
3.  **Refactor `CodeManager`**:
    - Implement Accordions.
    - Integrate `AddCodeDialog`.
    - Implement Log Correlation logic.
4.  **Update `SettingsModal`**: Add the new field.
