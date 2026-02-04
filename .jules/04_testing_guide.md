# End-to-End Testing with Playwright

We use **Playwright** for End-to-End (E2E) testing. To test Bluetooth interactions without physical hardware, we use an **Integrated Simulator**.

## The Simulator Fixture

We have created a custom Playwright fixture in `tests/fixtures.ts` that automatically sets up the environment for testing with the simulator.

### Features
1.  **Auto-Enable Simulator**: Automatically sets `window.BOKS_SIMULATOR_ENABLED = true` and persists it in `localStorage` to survive page reloads.
2.  **Event Capture**: Listens for `boks-tx` events (packets sent by the app to the simulator) and stores them for verification.
3.  **Helper Methods**: Provides easy-to-use methods to wait for and inspect BLE packets.
4.  **Console Logging**: Pipes browser console logs (filtered for Simulator/BLE) to the test runner output for easier debugging.

## Usage Guide

### 1. Import the Fixture

Instead of importing `test` from `@playwright/test`, import it from `./fixtures`.

```typescript
import { test, expect, BLEOpcode } from './fixtures';
```

### 2. Use the `simulator` Fixture in Tests

Add `simulator` to your test arguments. You don't need to manually enable anything; the fixture handles it.

```typescript
test('should open door', async ({ page, simulator }) => {
  await page.goto('/');
  // ... perform actions ...
});
```

### 3. Verify BLE Packets

Use `simulator.waitForTxOpcode(opcode)` to wait for a specific command to be sent.

```typescript
// Wait for the App to send OPEN_DOOR command
await simulator.waitForTxOpcode(BLEOpcode.OPEN_DOOR);

// Retrieve all captured events
const events = await simulator.getTxEvents();

// Find and assert on the specific packet
const packet = events.find(e => e.opcode === BLEOpcode.OPEN_DOOR);
expect(packet).toBeDefined();
expect(packet.payload).toEqual([49, 50, 51, 52, 53, 54]); // '123456'
```

## Common Issues & Tips

-   **Connection Button Ambiguity**: In responsive layouts, multiple "Connect" buttons might exist in the DOM (one for mobile, one for desktop). Use strict selectors:
    ```typescript
    await page.getByRole('button', { name: /connect/i }).filter({ hasText: /^Connect$|^$/ }).first().click();
    ```
-   **Wait for Connection**: Always assert the connection icon appears before proceeding.
    ```typescript
    await expect(page.locator('svg[data-testid="BluetoothConnectedIcon"]')).toBeVisible();
    ```
-   **Debugging**: If a test fails, check the console output. The fixture prints browser logs starting with `[Browser Console]`. Look for `⚠️ USING BOKS SIMULATOR ADAPTER ⚠️` to confirm the simulator is active.
