# ADR 002: BLE Communication Layer

## Context

The Boks hardware uses a proprietary BLE protocol. We need a robust way to communicate with it, handle connection instability, and support development without physical hardware.

## Decision

We implement a **Service-Based Architecture** with an **Adapter Pattern**.

### 1. Packet Encapsulation

- **Class-Based Packets:** Every command is a class (e.g., `OpenDoorPacket`) inheriting from `BoksTXPacket`.
- **Self-Serialization:** Each packet class knows how to serialize itself to binary (`toPacket()`).
- **Factory for RX:** A `RXPacketFactory` instantiates the correct response class based on the received Opcode.

### 2. Transport Abstraction (Adapter Pattern)

We define a generic `BLEAdapter` interface.

- **`WebBluetoothAdapter`:** Uses the browser's `navigator.bluetooth` API.
- **`SimulatedBluetoothAdapter`:** Connects to an internal `BoksSimulator` class for testing.

The `BoksBLEService` singleton holds a reference to the active adapter and orchestrates the queueing.

### 3. Queue Management

- **Sequential Execution:** A `BLEQueue` ensures commands are sent one by one.
- **Promise-Based:** `sendRequest()` returns a Promise that resolves when the corresponding response (if any) is received and parsed.

## Consequences

- **Testability:** We can write E2E tests using the Simulator without mocking the entire browser API.
- **Stability:** The queue prevents flooding the device.
