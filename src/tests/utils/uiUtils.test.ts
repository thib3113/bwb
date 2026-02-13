import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runTask } from '../../utils/uiUtils';
import { UI_MINIMUM_DURATION_MS } from '../../utils/bleConstants';

describe('runTask', () => {
  const showNotification = vi.fn();
  const hideNotification = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    showNotification.mockReset();
    hideNotification.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should ensure minimum duration when loadingMsg is provided', async () => {
    const task = vi.fn().mockResolvedValue('result');

    const runTaskPromise = runTask(task, {
      showNotification,
      hideNotification,
      loadingMsg: 'Loading...',
      successMsg: 'Success!'
    });

    expect(showNotification).toHaveBeenCalledWith('Loading...', 'info');

    // Advance time by slightly less than min duration (e.g. 450ms)
    // Current code waits 100ms, so it would fail here if we expect it to wait 500ms
    await vi.advanceTimersByTimeAsync(UI_MINIMUM_DURATION_MS - 50);

    // Should NOT have called success yet
    expect(showNotification).not.toHaveBeenCalledWith('Success!', 'success');

    // Advance remaining time
    await vi.advanceTimersByTimeAsync(100);

    expect(showNotification).toHaveBeenCalledWith('Success!', 'success');

    await expect(runTaskPromise).resolves.toBe('result');
  });

  it('should NOT delay if loadingMsg is NOT provided', async () => {
    const task = vi.fn().mockResolvedValue('result');

    const runTaskPromise = runTask(task, {
      showNotification,
      hideNotification,
      // No loadingMsg
      successMsg: 'Success!'
    });

    // Should not show loading
    expect(showNotification).not.toHaveBeenCalledWith(
      expect.stringContaining('Loading'),
      expect.anything()
    );

    // Should not wait for min duration or the old 100ms delay.
    // Since task is immediate, it should resolve almost immediately.

    await vi.advanceTimersByTimeAsync(10); // Minimal advance

    // With fix, this should be enough.
    expect(showNotification).toHaveBeenCalledWith('Success!', 'success');

    await expect(runTaskPromise).resolves.toBe('result');
  });
});
