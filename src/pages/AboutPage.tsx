import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Container,
  Divider,
  Grid,
  Link,
  Paper,
  Typography
} from '@mui/material';
import { BugReport, GitHub } from '@mui/icons-material';
import { GITHUB_ISSUES_URL, GITHUB_REPO_URL } from '../utils/constants';
import { useTranslation } from 'react-i18next';
import { DonationCard } from '../components/about/DonationCard';

export const AboutPage = () => {
  const { t } = useTranslation(['settings', 'common']);

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {t('settings:about.title')}
        </Typography>

        {/* Donation Card at the top */}
        <DonationCard />

        <Typography variant="body1" sx={{ mb: 2 }}>
          {t('settings:about.description')}
        </Typography>

        <Typography variant="body1" sx={{ mb: 2 }}>
          {t('settings:about.bluetooth_description')}
        </Typography>

        <Box sx={{ my: 3 }}>
          <Divider />
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t('settings:about.version')}
          </Typography>
          <Typography variant="body2">1.0.0</Typography>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t('settings:about.links')}
          </Typography>
          <Link href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer" underline="hover">
            {t('settings:about.github')}
          </Link>
        </Box>

        <Box>
          <Typography variant="h6" gutterBottom>
            {t('settings:about.credits')}
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {t('settings:about.credits_description')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('settings:about.disclaimer')}
          </Typography>
        </Box>

        <Box sx={{ my: 3 }}>
          <Divider />
        </Box>

        {/* Community & Support Section */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
            {t('common:community.title')}
          </Typography>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Card variant="outlined">
                <CardActionArea
                  onClick={() => window.open(GITHUB_REPO_URL, '_blank')}
                  sx={{ height: '100%' }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <GitHub sx={{ mr: 1 }} />
                      <Typography variant="h6">{t('common:community.github')}</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {t('settings:about.github')}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Card variant="outlined">
                <CardActionArea
                  onClick={() => window.open(GITHUB_ISSUES_URL, '_blank')}
                  sx={{ height: '100%' }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <BugReport sx={{ mr: 1 }} />
                      <Typography variant="h6">{t('common:community.github_issues')}</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {t('settings:about.github_issues')}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Container>
  );
};
