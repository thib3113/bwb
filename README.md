# Boks Web BLE - AI Agent Onboarding Guide

## Project Overview

This is a modern Preact + Vite Web BLE application designed to replace the older vanilla JavaScript demo. It provides a comprehensive interface for interacting with Boks smart parcel boxes via Bluetooth Low Energy (BLE).

The application features responsive layouts for both mobile and desktop views with improved UI/UX, using a modular component structure with Material-UI components.

**Status:** Active Development
**Deployment:** GitHub Pages (Static)

## 📚 Technical Knowledge Base (`.jules/`)
**CRITICAL:** This project relies on specific, reverse-engineered knowledge of the Boks proprietary firmware.
All technical documentation is strictly compartmentalized in the **`.jules/`** directory.

You **MUST** consult these files for any implementation details regarding the protocol:

*   **[`01_protocol_specs.md`](.jules/01_protocol_specs.md)**
    *   *The "Dictionary":* Contains all UUIDs, Command Opcodes, Notification Opcodes, and Byte structures.
*   **[`02_ble_workflows.md`](.jules/02_ble_workflows.md)**
    *   *The "Script":* Detailed sequence diagrams for features (Opening the door, Syncing Logs, Registering NFC tags).
*   **[`03_quirks_workarounds.md`](.jules/03_quirks_workarounds.md)**
    *   *The "Reality Check":* Essential workarounds for hardware bugs (Flash write latency, Battery parsing, Connection limits).
*   **[`04_testing_guide.md`](.jules/04_testing_guide.md)**
    *   *The "Test Suite":* Guide on using the Playwright Simulator fixture for E2E testing.

## Tech Stack

- **Preact**: Lightweight alternative to React for building user interfaces
- **Vite**: Fast build tool and development server
- **vite-plugin-pwa**: Adds Progressive Web App support
- **Material-UI (MUI)**: UI component library for consistent design
- **Dexie.js**: IndexedDB wrapper for local data storage
- **i18next**: Internationalization framework
- **Web BLE API**: Browser API for Bluetooth communication

## Key Features

### BLE Connection & Commands
- Connect to Boks devices via Web Bluetooth API
- Send commands to the device (open door, request logs, etc.)
- Receive notifications from the device
- View connection status and device information
- Battery level monitoring (Auto-detect proprietary vs standard)

### Data Management
- Local storage using IndexedDB (via Dexie.js) scoped by device ID
- Data persistence between sessions
- Migration from localStorage to IndexedDB
- Pending actions synchronization (add/delete codes when device is offline)

### Code Management
- Create new codes (Master, Single-Use, Multi-Use)
- List saved codes with descriptions
- Delete codes
- Mark codes as used when validated by the device
- Add descriptions to codes for better organization
- Accordion-based organization for mobile view

### Log Viewer & Activity Logger
- View event logs from the device
- Parse logs to show code usage events
- Pending logs counter
- Refresh functionality to get latest logs from device
- **Activity Logger (Debug View)**: Real-time capture of all BLE traffic (TX/RX), including raw unparsable packets, connection state changes, and errors. Features compressed JSON export.
- **Auto-Sync**: Sequential synchronization on connection: Logs are fetched first, then Code Counts.

### Internationalization (EN/FR)
- Full support for English and French languages
- Language selector in the UI
- Automatic language detection based on browser settings
- Manual language override with persistence in IndexedDB

### Security & Settings
- **Per-Device Configuration**: Configuration Key and Door PIN Code are now linked to each specific Boks device instead of global settings.
- **Visibility Toggles**: Sensitive fields (PIN, Config Key) feature "eye" icons to toggle between masked and clear text.
- **Robust Protocol**: `packetParser` is now resilient to firmware inconsistencies (e.g., opcode 0xC3 using total length instead of payload length in the header).
- **Write Without Response**: Commands are sent using `writeValueWithoutResponse` to match official firmware expectations and reduce latency.

### Responsive Design

The application implements a responsive design strategy that adapts the layout based on screen size:

- **Breakpoint**: Uses `useMediaQuery` with a 900px breakpoint to switch between views.
- **Mobile View**:
  - Bottom Navigation Bar for primary sections (Home, Logs, Codes, Settings).
  - Stacked layout optimized for vertical scrolling.
  - Simplified headers and larger touch targets.
- **Desktop View**:
  - Persistent Sidebar Navigation on the left.
  - Dual-pane layouts where appropriate (e.g., list on left, details on right).
  - Enhanced data tables with more columns visible.

### State Management

The application uses React's Context API for global state management:

- **BLEContext** (`src/context/BLEContext.tsx`) - Manages Bluetooth connection state, raw communication, and the Activity Logger history.
- **DeviceContext** (`src/context/DeviceContext.tsx`) - Tracks known devices, active device, and device-specific settings (PIN, Configuration Key).
- **DeviceLogContext** (`src/context/DeviceLogContext.tsx`) - Handles the logic for log synchronization and automatic discovery on connection.
- **CodeCountContext** (`src/context/CodeCountContext.tsx`) - Manages the permanent and single-use code counters.

### Data Storage

Data persistence is handled through IndexedDB via Dexie.js (Database name: `BoksDatabase`):

- **Dexie.js Database** (`src/db/db.ts`) - V2 Schema with UUID primary keys and relational mapping (logs/codes linked to device UUID).
- **StorageService** (`src/services/StorageService.ts`) - Business logic for data persistence and synchronization.

## UI Utilities

The project includes specific utilities to improve UX during BLE operations:
- `runTask`: Wraps an async task with automatic "Loading" and "Success/Error" toast management.
- `withMinimumDuration`: Ensures a task takes at least X ms to prevent UI flickering on fast BLE responses.
- `hideNotification`: Programmatically close active toasts.

## Development Guidelines

- **Consult `.jules/` first:** Before implementing any new BLE feature, check the `02_ble_workflows.md` file.
- **Robust Parsing:** Never trust the length byte in Boks BLE packets. Use the actual buffer size and checksum verification.
- **Sequential BLE:** Avoid sending multiple commands simultaneously. Use the `BLEQueue` and implement delays between requests (standard is 250-500ms).
- **Hardware Stability:** Respect the "Flash Write Blind Window" (see `03_quirks_workarounds.md`) by avoiding heavy commands immediately after a door event.
- **Per-Device Context:** Always ensure sensitive settings (PIN, Keys) are retrieved from the `activeDevice` object, not global state.
- **Activity Logging:** All significant BLE events and state changes must be emitted to the `BLEContext` to be visible in the Activity Logger.

## End-to-End Testing

We use Playwright with a custom simulator fixture to test BLE features.
**All new tests must use the `simulator` fixture from `tests/fixtures.ts`.**

For detailed instructions, see: **[`04_testing_guide.md`](.jules/04_testing_guide.md)**.

## Key Files/Directories

- `src/context/` - Global state management (BLE, Device, Theme contexts)
- `src/components/` - UI components organized by feature and layout
  - `layout/` - Responsive layout components (MainLayout, Header, MobileView, DesktopView)
  - `common/` - Shared UI components (FloatingActionButton)
- `src/services/` - Business logic and data persistence (StorageService)
- `src/hooks/` - Custom React hooks for accessing contexts
- `src/utils/` - Utility functions and BLE constants
- `src/db/` - Database implementation with Dexie.js

## ⚖️ Legal Notice / Mentions Légales

### 🇬🇧 English

**Unofficial & Non-Commercial Project**
This project is an independent, open-source **Web Application (PWA)** developed for interoperability purposes. It is **not** affiliated with, endorsed by, or associated with the manufacturer of the device or its official application.

**License**
This work is licensed under a **[Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License](http://creativecommons.org/licenses/by-nc-sa/4.0/)**.
You are free to share and adapt the material for any **non-commercial** purpose, under the condition that you provide appropriate credit and distribute your contributions under the same license.

**Reverse Engineering**
The code provided is the result of independent reverse engineering conducted in accordance with European Directive 2009/24/EC.
> 👉 Please read the full **[Legal Disclaimer & Reverse Engineering Notice](legals.md)** before using this software.

---

### 🇫🇷 Français

**Projet Non Officiel & Non Commercial**
Ce projet est une **Application Web (PWA)** indépendante et open-source développée à des fins d'interopérabilité. Il n'est **pas** affilié, soutenu ou associé au fabricant de l'appareil ou à son application officielle.

**Licence**
Ce travail est mis à disposition selon les termes de la **[Licence Creative Commons Attribution - Pas d’Utilisation Commerciale - Partage dans les Mêmes Conditions 4.0 International](http://creativecommons.org/licenses/by-nc-sa/4.0/)**.
Vous êtes libre de partager et d'adapter le matériel pour tout usage **non commercial**, à condition de créditer l'auteur et de distribuer vos modifications sous la même licence.

**Ingénierie Inverse**
Le code fourni est le résultat d'une ingénierie inverse indépendante menée conformément à la Directive Européenne 2009/24/CE.
> 👉 Veuillez lire l'intégralité de la **[Mention Légale & Avis d'Ingénierie Inverse](legals.md)** avant d'utiliser ce logiciel.
