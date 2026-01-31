# Implementation Plan: Refine "My Boks" Page

## Objective
Refine the `MyBoksPage` to support multiple devices, add missing translations, and include a placeholder for User Management.

## Tasks

### 1. Update Translations
- **File:** `src/locales/fr/common.json`
  - Add `"my_boks": "Ma Boks"`
  - Add `"users": { "title": "Utilisateurs" }`
- **File:** `src/locales/en/common.json`
  - Add `"my_boks": "My Boks"`
  - Add `"users": { "title": "Users" }`

### 2. Refactor `MyBoksPage.tsx`
- **File:** `src/pages/MyBoksPage.tsx`
- **Imports:**
  - Add `Select`, `MenuItem`, `FormControl`, `InputLabel` from `@mui/material`.
- **Logic:**
  - Destructure `knownDevices` and `setActiveDevice` from `useDevice()`.
- **UI Changes:**
  - **Header:**
    - Check if `knownDevices.length > 1`.
    - If yes, render a `Select` dropdown allowing the user to choose the active device.
      - Value: `activeDevice.id`
      - OnChange: Call `setActiveDevice(newValue)`.
    - If no (or only 1), keep the existing `Typography` displaying the device name.
  - **Tabs:**
    - Add a new `Tab` for "Users" (Utilisateurs).
    - Label: `t('common:users.title')`
    - Prop: `disabled={true}`
    - Add a corresponding `TabPanel` (index 3) with placeholder content (e.g., "User management coming soon").

### 3. Verification
- Ensure "Renaming" and "Changing PIN/Config Key" are accessible in the "Settings" tab (index 2) for the *selected* device.
- Verify that switching devices updates the context and the displayed data in other tabs.
