import { Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface CodeCounts {
  master: number;
  single: number;
  total: number;
}

interface CodeStatsProps {
  masterCodesCount: number;
  temporaryCodesCount: number;
  codeCount: CodeCounts | null;
}

export const CodeStats = ({ masterCodesCount, temporaryCodesCount, codeCount }: CodeStatsProps) => {
  const { t } = useTranslation('codes');

  return (
    <Typography variant="subtitle1" color="textSecondary" sx={{ mb: 2 }} data-testid="code-stats">
      {t('master_codes')}: {masterCodesCount}
      {codeCount && ` / ${codeCount.master} ${t('on_device_count')}`}
      {' | '}
      {t('temporary_codes')}: {temporaryCodesCount}
      {codeCount && ` / ${codeCount.single} ${t('on_device_count')}`}
    </Typography>
  );
};
