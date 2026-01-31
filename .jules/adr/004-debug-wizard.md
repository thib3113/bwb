# ADR 004: Debug Wizard & Telemetry

## Context
BLE debugging in the wild is difficult. Users encounter issues ("It doesn't connect") that are hard to reproduce without logs.

## Decision
We implement a persistent **Activity Logger** (Debug Wizard).

### Mechanism
1.  **Event Bus:** The `BoksBLEService` emits events (`PACKET_SENT`, `PACKET_RECEIVED`, `ERROR`).
2.  **In-Memory Buffer:** `BLEContext` keeps a rolling buffer of the last N events.
3.  **UI Visualization:** A dedicated "Logs" or "Debug" view shows this stream in real-time (hex dumps + parsed meaning).
4.  **Export:** A "Share Logs" button exports the buffer as a JSON file for support/analysis.

## Consequences
*   **Transparency:** Users can see exactly what's happening.
*   **Diagnostics:** Developers can analyze JSON dumps to fix protocol edge cases.
