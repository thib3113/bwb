# ADR 001: Class-Based BLE Packet Architecture

## Status

Accepted

## Context

The Boks BLE protocol involves sending specific byte sequences (Opcode, Payload, Checksum) to the device.
Previously (or in other implementations), these might have been constructed as raw byte arrays scattered throughout the application logic.
To improve maintainability, type safety, and readability, we need a structured way to handle these packets.

## Decision

We implement a class-based architecture for BLE Packets located in `src/ble/packets/`.

1.  **Base Class (`BoksTXPacket`)**:
    - Abstract class that defines the contract.
    - Handles the common "framing" logic: `[Opcode, Length, ...Payload, Checksum]`.
    - Implements the Checksum calculation automatically.

2.  **Concrete Classes**:
    - Each command (e.g., `OpenDoorPacket`, `RequestLogsPacket`) extends the base class.
    - The concrete class is responsible only for the `Opcode` and the specific `Payload` construction.

## Consequences

- **Pros**:
  - **Encapsulation**: The logic for constructing a packet is isolated.
  - **Safety**: Checksums are always calculated correctly by the base class.
  - **Readability**: `service.send(new OpenDoorPacket('1234'))` is clearer than `service.send([0x01, 0x04, ...])`.
- **Cons**:
  - Slightly more boilerplate file creation for simple commands.
