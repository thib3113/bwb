import React from 'react';
import { Box, Card, CardContent, Divider, Link, Typography } from '@mui/material';
import { BugReport, Favorite, GitHub } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { GITHUB_ISSUES_URL, GITHUB_REPO_URL } from '../../../utils/constants';

export const SettingsCommunity: React.FC = () => {
  const { t } = useTranslation(['common', 'settings']);

  return (
    <>
      <Divider sx={{ my: 3 }} />
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {t('common:community.title')}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <GitHub sx={{ mr: 1 }} />
            <Link
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              underline="hover"
            >
              {t('common:community.github')}
            </Link>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <BugReport sx={{ mr: 1 }} />
            <Link
              href={GITHUB_ISSUES_URL}
              target="_blank"
              rel="noopener noreferrer"
              underline="hover"
            >
              {t('common:community.github_issues')}
            </Link>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
            <Favorite sx={{ mr: 1, mt: 0.5, color: 'error.main' }} />
            <Box>
              <Typography variant="body2">
                <Link
                  href="https://buymeacoffee.com/thib3113"
                  target="_blank"
                  rel="noopener noreferrer"
                  underline="hover"
                >
                  {t('common:community.donate')}
                </Link>
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {t('common:community.donate_description')}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </>
  );
};
