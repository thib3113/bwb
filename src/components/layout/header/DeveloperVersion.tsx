import React, { useState, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import pkg from '../../../../package.json';
import { useDeveloperContext } from '../../../context/DeveloperContextTypes';

interface DeveloperVersionProps {
  showNotification: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const DeveloperVersion = ({ showNotification }: DeveloperVersionProps) => {
  const { t } = useTranslation('settings');
  const theme = useTheme();
  const { isDeveloperMode, enableDeveloperMode } = useDeveloperContext();
  const [devClickCount, setDevClickCount] = useState(0);
  const devClickTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleVersionClick = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();

    const newCount = devClickCount + 1;
    setDevClickCount(newCount);

    if (devClickTimerRef.current) {
      clearTimeout(devClickTimerRef.current);
    }

    if (newCount >= 7) {
      if (isDeveloperMode) {
        showNotification(t('developer.developer_already_active'), 'info');
      } else {
        enableDeveloperMode();
        showNotification(t('developer.enabled_success'), 'success');
      }
      setDevClickCount(0);
    } else {
      devClickTimerRef.current = setTimeout(() => {
        setDevClickCount(0);
      }, 3000);
    }
  };

  // Calculate percentage for visual feedback (0 to 100%)
  const devProgress = Math.min(100, (devClickCount / 7) * 100);

  return (
    <Box sx={{ p: 2, textAlign: 'center' }}>
      <Typography
        variant="caption"
        color="text.secondary"
        display="block"
        onClick={handleVersionClick}
        data-testid="version-text"
        sx={{
          cursor: 'default',
          userSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
          outline: 'none',
          display: 'inline-block',
          background:
            devClickCount > 0
              ? `linear-gradient(90deg, #E0FFE0 ${devProgress}%, ${theme.palette.primary.main} ${devProgress}%)`
              : 'inherit',
          backgroundClip: devClickCount > 0 ? 'text' : 'border-box',
          WebkitBackgroundClip: devClickCount > 0 ? 'text' : 'border-box',
          color: devClickCount > 0 ? 'transparent' : 'inherit',
          transition: 'background 0.2s ease'
        }}
      >
        v{pkg.version}-{__COMMIT_HASH__}
      </Typography>
    </Box>
  );
};
