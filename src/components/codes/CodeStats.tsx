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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tAny = t as any;

  return (
    <Typography variant="subtitle1" color="textSecondary" sx={{ mb: 2 }}>
      {tAny('master_codes')}: {masterCodesCount}
      {codeCount && ` / ${codeCount.master} ${tAny('on_device_count')}`}
      {' | '}
      {tAny('temporary_codes')}: {temporaryCodesCount}
      {codeCount && ` / ${codeCount.single} ${tAny('on_device_count')}`}
    </Typography>
  );
};
