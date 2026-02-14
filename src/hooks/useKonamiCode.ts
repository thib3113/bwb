import { useEffect, useRef, useState } from 'react';
import { useDrag } from '@use-gesture/react';

const KONAMI_SEQUENCE = ['UP', 'UP', 'DOWN', 'DOWN', 'LEFT', 'RIGHT', 'LEFT', 'RIGHT'];
const TIMEOUT_MS = 2000; // Time allowed between gestures

export const KONAMI_EVENT = 'boks:konami-update';

export interface KonamiUpdateDetail {
  direction: string | null;
  sequenceIndex: number;
  expected: string;
  status: 'progress' | 'reset' | 'success';
}

export const useKonamiCode = (onSuccess: () => void) => {
  const [sequenceIndex, setSequenceIndex] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const dispatchUpdate = (
    direction: string | null,
    index: number,
    status: 'progress' | 'reset' | 'success'
  ) => {
    const detail: KonamiUpdateDetail = {
      direction,
      sequenceIndex: index,
      expected: KONAMI_SEQUENCE[index] || 'NONE',
      status
    };
    window.dispatchEvent(new CustomEvent(KONAMI_EVENT, { detail }));
  };

  const resetSequence = (reason: string = 'timeout') => {
    console.log('Konami Reset:', reason);
    setSequenceIndex(0);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    dispatchUpdate(null, 0, 'reset');
  };

  useDrag(
    ({ swipe: [swipeX, swipeY], last }) => {
      // Prevent default behavior to avoid scrolling while swiping
      // event.preventDefault(); // Might be too aggressive

      // Only trigger on gesture end
      if (!last) return;

      let direction = '';
      if (swipeY === -1) direction = 'UP';
      else if (swipeY === 1) direction = 'DOWN';
      else if (swipeX === -1) direction = 'LEFT';
      else if (swipeX === 1) direction = 'RIGHT';

      if (!direction) {
        // console.log('No direction detected in drag');
        return;
      }

      console.log('Swipe detected:', direction, 'Current index:', sequenceIndex);

      if (direction === KONAMI_SEQUENCE[sequenceIndex]) {
        const nextIndex = sequenceIndex + 1;
        setSequenceIndex(nextIndex);

        dispatchUpdate(direction, nextIndex, 'progress');

        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => resetSequence('timeout'), TIMEOUT_MS);

        if (nextIndex === KONAMI_SEQUENCE.length) {
          console.log('Konami Code Activated!');
          dispatchUpdate(direction, nextIndex, 'success');
          onSuccess();
          // Reset after a delay to allow success animation
          setTimeout(() => resetSequence('success-cleanup'), 100);
        }
      } else {
        // If the gesture is wrong, but it matches the first gesture of the sequence, start over immediately
        if (direction === KONAMI_SEQUENCE[0]) {
          console.log('Wrong gesture, restarting sequence with', direction);
          setSequenceIndex(1);
          dispatchUpdate(direction, 1, 'progress');
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => resetSequence('timeout'), TIMEOUT_MS);
        } else {
          console.log(
            'Wrong gesture, resetting. Expected:',
            KONAMI_SEQUENCE[sequenceIndex],
            'Got:',
            direction
          );
          resetSequence('wrong-gesture');
        }
      }
    },
    {
      target: typeof window !== 'undefined' ? window : undefined,
      eventOptions: { passive: false }, // Important for swipes sometimes
      pointer: { touch: true } // Ensure touch events are captured
    }
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);
};
