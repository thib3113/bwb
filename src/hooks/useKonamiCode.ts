import { useEffect, useRef, useState } from 'react';
import { useDrag } from '@use-gesture/react';

const KONAMI_SEQUENCE = ['UP', 'UP', 'DOWN', 'DOWN', 'LEFT', 'RIGHT', 'LEFT', 'RIGHT'];
const TIMEOUT_MS = 2000; // Time allowed between gestures

export const useKonamiCode = (onSuccess: () => void) => {
  const [sequenceIndex, setSequenceIndex] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetSequence = () => {
    setSequenceIndex(0);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  useDrag(
    ({ swipe: [swipeX, swipeY] }) => {
      let direction = '';
      if (swipeY === -1) direction = 'UP';
      else if (swipeY === 1) direction = 'DOWN';
      else if (swipeX === -1) direction = 'LEFT';
      else if (swipeX === 1) direction = 'RIGHT';

      if (!direction) return;

      console.log('Swipe detected:', direction, 'Current index:', sequenceIndex);

      if (direction === KONAMI_SEQUENCE[sequenceIndex]) {
        const nextIndex = sequenceIndex + 1;
        setSequenceIndex(nextIndex);

        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(resetSequence, TIMEOUT_MS);

        if (nextIndex === KONAMI_SEQUENCE.length) {
          console.log('Konami Code Activated!');
          onSuccess();
          resetSequence();
        }
      } else {
        // If the gesture is wrong, but it matches the first gesture of the sequence, start over immediately
        if (direction === KONAMI_SEQUENCE[0]) {
          setSequenceIndex(1);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(resetSequence, TIMEOUT_MS);
        } else {
          resetSequence();
        }
      }
    },
    {
      target: typeof window !== 'undefined' ? window : undefined,
      eventOptions: { passive: false } // Important for swipes sometimes
    }
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);
};
