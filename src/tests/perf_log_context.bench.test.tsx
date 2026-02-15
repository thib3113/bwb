import { render, cleanup, screen } from '@testing-library/react';
import { describe, it, afterEach, expect } from 'vitest';
import { LogProvider } from '../context/LogContext';
import { useLogContext } from '../hooks/useLogContext';
import { useEffect } from 'react';

const PACKET_COUNT = 100;

// Component to trigger logs
const LogFlooder = ({ onComplete }: { onComplete: () => void }) => {
  const { addDebugLog } = useLogContext();

  useEffect(() => {
    let sent = 0;
    const interval = setInterval(() => {
      if (sent >= PACKET_COUNT) {
        clearInterval(interval);
        onComplete();
        return;
      }
      addDebugLog({
        id: sent,
        timestamp: new Date(),
        raw: `Packet ${sent}`,
        type: 'packet'
      });
      sent++;
    }, 1);

    return () => clearInterval(interval);
  }, [addDebugLog, onComplete]);

  return null;
};

// Component to verify logs
const LogVerifier = ({ onRender }: { onRender: () => void }) => {
  const { debugLogs } = useLogContext();
  useEffect(() => {
    onRender();
  });

  return (
    <div data-testid="log-verifier">
      <span data-testid="log-count">{debugLogs.length}</span>
      <span data-testid="first-log">{debugLogs[0]?.raw}</span>
      <span data-testid="last-log">{debugLogs[debugLogs.length - 1]?.raw}</span>
    </div>
  );
};

describe('LogContext Performance', () => {
  afterEach(cleanup);

  it('measures render count and verifies log integrity', () => {
    let renderCount = 0;
    const onRender = () => { renderCount++; };

    return new Promise<void>((resolve, reject) => {
      render(
        <LogProvider>
          <LogVerifier onRender={onRender} />
          <LogFlooder onComplete={() => {
            // Wait for final flush (timeout is 50ms, so give it 100ms)
            setTimeout(() => {
              try {
                const count = screen.getByTestId('log-count').textContent;
                const firstLog = screen.getByTestId('first-log').textContent;
                const lastLog = screen.getByTestId('last-log').textContent;

                console.log(`Total Renders: ${renderCount}`);
                console.log(`Final Log Count: ${count}`);
                console.log(`First Log: ${firstLog}`); // Should be Packet 99
                console.log(`Last Log: ${lastLog}`); // Should be Packet 0

                expect(Number(count)).toBe(PACKET_COUNT);
                expect(firstLog).toBe(`Packet ${PACKET_COUNT - 1}`);
                expect(lastLog).toBe('Packet 0');

                // Ensure render count is significantly lower than packet count
                expect(renderCount).toBeLessThan(PACKET_COUNT / 2);

                resolve();
              } catch (e) {
                reject(e);
              }
            }, 100);
          }} />
        </LogProvider>
      );
    });
  });
});
