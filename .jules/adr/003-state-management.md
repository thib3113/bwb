# ADR 003: State Management & Persistence

## Context
The app needs to manage ephemeral state (connection status, current logs) and persistent state (saved PIN codes, device keys, history).

## Decision
We use a hybrid approach: **React Context for UI State** and **IndexedDB for Data**.

### 1. React Contexts
*   **`BLEContext`:** Source of truth for connection state (`connected`, `scanning`) and real-time packet logs.
*   **`DeviceContext`:** Holds the currently selected device and its configuration (keys).

### 2. Persistence (Dexie.js)
We use **Dexie.js** as a wrapper around IndexedDB.
*   **Why?** `localStorage` is synchronous (blocking) and limited in size. IndexedDB is async and handles larger datasets (like years of logs).
*   **Schema:**
    *   `devices`: Known Boks (UUID, Name, ConfigKey).
    *   `codes`: PIN codes associated with devices.
    *   `logs`: Historical events.

## Consequences
*   **Offline First:** The app works fully offline once loaded.
*   **Data Safety:** Data persists across browser restarts.
