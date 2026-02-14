import { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import { ArrowUpward, ArrowDownward, ArrowBack, ArrowForward } from '@mui/icons-material';
import { KONAMI_EVENT, KonamiUpdateDetail } from '../../../hooks/useKonamiCode';

export const KonamiIndicator = () => {
  const [indicator, setIndicator] = useState<{ direction: string; id: number } | null>(null);

  useEffect(() => {
    const handleKonamiUpdate = (event: Event) => {
      const detail = (event as CustomEvent<KonamiUpdateDetail>).detail;

      // Only show indicator for progress steps (starting from 2nd step as requested)
      // "à partir de la deuxième étape du code" -> index >= 1 (0 is first, 1 is second)
      if (detail.status === 'progress' && detail.sequenceIndex >= 1 && detail.direction) {
        setIndicator({ direction: detail.direction, id: Date.now() });

        // Hide after 500ms
        setTimeout(() => {
          setIndicator((current) => (current?.direction === detail.direction ? null : current));
        }, 500);
      }
    };

    window.addEventListener(KONAMI_EVENT, handleKonamiUpdate);
    return () => {
      window.removeEventListener(KONAMI_EVENT, handleKonamiUpdate);
    };
  }, []);

  if (!indicator) return null;

  const getIcon = (dir: string) => {
    switch (dir) {
      case 'UP':
        return <ArrowUpward fontSize="large" />;
      case 'DOWN':
        return <ArrowDownward fontSize="large" />;
      case 'LEFT':
        return <ArrowBack fontSize="large" />;
      case 'RIGHT':
        return <ArrowForward fontSize="large" />;
      default:
        return null;
    }
  };

  return (
    <Box
      sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        opacity: 0.7,
        pointerEvents: 'none',
        zIndex: 2000,
        color: 'secondary.main', // Use secondary color (green in matrix mode)
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'fadeOut 0.5s ease-out forwards',
        '@keyframes fadeOut': {
          '0%': { opacity: 1, transform: 'translate(-50%, -50%) scale(1.5)' },
          '100%': { opacity: 0, transform: 'translate(-50%, -50%) scale(0.5)' }
        }
      }}
    >
      {getIcon(indicator.direction)}
    </Box>
  );
};
