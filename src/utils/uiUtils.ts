/**
 * UI Utility functions
 */
import { UI_NOTIFICATION_DELAY_MS, UI_MINIMUM_DURATION_MS } from './bleConstants';

interface RunTaskOptions {
  showNotification: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  hideNotification: () => void;
  loadingMsg?: string;
  successMsg?: string;
  errorMsg?: string;
}

/**
 * Runs an asynchronous task with automatic notification management.
 */
export async function runTask<T>(
  task: () => Promise<T>,
  options: RunTaskOptions
): Promise<T | undefined> {
  const { showNotification, hideNotification, loadingMsg, successMsg, errorMsg } = options;

  if (loadingMsg) {
    showNotification(loadingMsg, 'info');
  }

  try {
    const result = await task();

    if (successMsg) {
      // Small delay before success to avoid MUI Snackbar transition bugs
      await new Promise((r) => setTimeout(r, UI_NOTIFICATION_DELAY_MS));
      showNotification(successMsg, 'success');
    } else {
      hideNotification();
    }

    return result;
  } catch (error: unknown) {
    const finalErrorMsg = errorMsg || (error as Error).message || String(error);
    showNotification(finalErrorMsg, 'error');
    // We don't re-throw here to allow UI to continue,
    // but you might want to depending on usage.
    return undefined;
  }
}

/**
 * Ensures that a promise takes at least a minimum amount of time to resolve.
 * Useful for preventing "flickering" or too-fast transitions in the UI.
 *
 * @param promise The promise to wrap
 * @param minDurationMs Minimum duration in milliseconds (default 500)
 * @returns The result of the original promise
 */
export async function withMinimumDuration<T>(
  promise: Promise<T>,
  minDurationMs: number = UI_MINIMUM_DURATION_MS
): Promise<T> {
  const startTime = Date.now();

  const result = await promise;
  const elapsed = Date.now() - startTime;

  if (elapsed < minDurationMs) {
    await new Promise((resolve) => setTimeout(resolve, minDurationMs - elapsed));
  }

  return result;
}
