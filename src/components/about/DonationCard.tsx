import React from 'react';
import { Box, Card, CardContent, Link, Typography } from '@mui/material';
import { Favorite } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

export const DonationCard: React.FC = () => {
  const { t } = useTranslation(['settings']);

  return (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
          <Favorite sx={{ mr: 1, mt: 0.5, color: 'error.main' }} />
          <Box>
            <Typography variant="h6" gutterBottom>
              {t('settings:about.support_title')}
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              {t('settings:about.support_description')}
            </Typography>
            <Typography variant="body2">
              <Link
                href="https://buymeacoffee.com/thib3113"
                target="_blank"
                rel="noopener noreferrer"
                underline="hover"
              >
                {t('settings:about.donate_link')}
              </Link>
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};
