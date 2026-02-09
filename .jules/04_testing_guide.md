# End-to-End Testing with Playwright

We use **Playwright** for End-to-End (E2E) testing. To test Bluetooth interactions without physical hardware, we use an **Integrated Simulator**.

## 🚀 Core Mandates

- **Use the Simulator**: NEVER mock internal services or APIs if the simulator can handle it. The simulator is designed to verify the entire BLE stack, from the UI down to the protocol layer.
- **Unified API**: Always use `window.boksSimulator` to interact with the simulator from within tests.
- **Maintain Connection**: Avoid using `page.goto()` once connected to a Boks, as it triggers a full page reload and destroys the memory-resident simulator instance (causing BLE disconnection). Use UI-based navigation instead.

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

Add `simulator` to your test arguments.

```typescript
test('should open door', async ({ page, simulator }) => {
  await simulator.connect();
  // ... perform actions ...
});
```

#### `simulator.connect(options)`
- `skipReturnToHome`: Set to `true` if you want to stay on the page you're redirected to after connection (e.g., `/my-boks` for new devices). This is critical for testing setup flows without triggering a `page.goto()`.

### 3. Control Hardware State

In a Playwright test, you can control the hardware state via `page.evaluate()` using `window.boksSimulator`:

```typescript
// Set firmware/software versions
await page.evaluate(() => {
  window.boksSimulator?.setVersion('4.3.3', '10/125');
});

// Trigger a hardware event (like an NFC scan)
await page.evaluate(() => {
  window.boksSimulator?.triggerNfcScan('04:A1:B2:C3:D4:E5:F6');
});
```

### 4. Verify BLE Packets

Use `simulator.waitForTxOpcode(opcode)` to wait for a specific command to be sent.

```typescript
// Wait for the App to send OPEN_DOOR command
await simulator.waitForTxOpcode(BLEOpcode.OPEN_DOOR);

// Retrieve all captured events
const events = await simulator.getTxEvents();

// Find and assert on the specific packet
const packet = events.find((e) => e.opcode === BLEOpcode.OPEN_DOOR);
expect(packet).toBeDefined();
expect(packet.payload).toEqual([49, 50, 51, 52, 53, 54]); // '123456'
```

## ⚠️ Common Pitfalls

1. **BLE Disconnection**: If your test suddenly reports "Service disconnected", check if you used `page.goto()` or `page.reload()`. Use UI navigation instead (e.g., clicking on the menu).
2. **Timing**: The simulator has built-in delays (50-800ms) to mimic real hardware physics. Use `expect(...).toBeVisible({ timeout: 15000 })` to be safe.
3. **Database State**: Use `window.resetApp()` (available via `page.evaluate`) to ensure a clean state between tests if needed, though the fixture handles basic reset.
4. **Debugging**: If a test fails, check the console output. The fixture prints browser logs starting with `[Browser Console]`. Look for `⚠️ USING BOKS SIMULATOR ADAPTER ⚠️` to confirm the simulator is active.