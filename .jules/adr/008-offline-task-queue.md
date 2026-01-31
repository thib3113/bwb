# ADR 008: Offline Task Queue & Command Pattern

## Status
Accepted

## Context
Users (Admins) need to manage Boks codes even when not connected to the device via Bluetooth.
Previously, the "Todo List" of tasks (e.g., Add Code, Delete Code) was only generated when the device was connected.
This prevented the application from showing a "Pending Actions" state immediately upon loading, and coupled the *planning* of tasks too tightly with the *execution*.

Additionally, handling Master Codes requires a specific sequence of operations:
- Master Codes are stored by Index (0-255).
- To overwrite a Master Code at a specific index, we must first DELETE the existing code at that index before ADDING the new one.
- This is to prevent index accumulation bugs where multiple codes might technically exist for the same index in the Boks memory if not properly cleaned up.

## Decision
We will decouple **Task Generation** from **Task Execution**.

1. **Offline Task Generation (Planning)**:
   - The `useTaskConsistency` hook is responsible for looking at the persistent state (Dexie DB `codes` table).
   - It identifies codes with `PENDING_ADD` or `PENDING_DELETE` status.
   - It generates the corresponding `BoksTask` objects (Command Pattern) immediately when the application loads or the active device changes, **regardless of Bluetooth connection status**.
   - These tasks are stored in the in-memory `TaskContext`.

2. **Online Task Execution**:
   - The `TaskContext` (specifically `processPendingTasks`) remains responsible for *executing* these tasks.
   - Execution only happens when `isConnected` is true.

3. **Master Code Handling**:
   - When a "Create Master Code" task is generated (from a `PENDING_ADD` code), the `TaskContext` must automatically decompose this into two operations:
     1. `DELETE_MASTER_CODE` (Priority 0 - High)
     2. `ADD_MASTER_CODE` (Priority 3 - Normal)
   - This ensures the index is cleared before the new code is written.

## Consequences
- **Positive**: Users see "Pending Actions" (via the Bluetooth badge) immediately. The application feels more responsive. The complex logic of Master Code overwriting is centralized in the Task generation layer.
- **Negative**: Tasks are currently in-memory only. If the user refreshes the page, tasks are re-calculated from the DB state. This is acceptable as the DB is the source of truth.
