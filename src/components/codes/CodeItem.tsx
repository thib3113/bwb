import {
  Box,
  IconButton,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  Tooltip,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EditIcon from '@mui/icons-material/Edit';
import { useTranslation } from 'react-i18next';
import { BoksCode } from '../../types';
import { CODE_STATUS } from '../../constants/codeStatus';

interface CodeItemProps {
  code: BoksCode;
  metadata: {
    lastUsed?: Date;
    used?: boolean;
    usedDate?: Date;
  };
  onCopy: (code: string) => void;
  onEdit: (code: BoksCode) => void;
  onDelete: (id: string) => void;
}

export const CodeItem = ({ code, metadata, onCopy, onEdit, onDelete }: CodeItemProps) => {
  const { t } = useTranslation('codes');

  const isPendingDelete = code.status === CODE_STATUS.PENDING_DELETE;
  const isUsed = metadata.used;

  const isDimmed = isPendingDelete || isUsed;

  return (
    <ListItem
      divider
      sx={{
        opacity: isDimmed ? 0.6 : 1,
        backgroundColor: isDimmed ? 'action.selected' : 'inherit',
        textDecoration: isDimmed ? 'line-through' : 'none',
        borderLeft: '4px solid',
        borderLeftColor:
          code.status === CODE_STATUS.ON_DEVICE
            ? 'primary.main'
            : code.status === CODE_STATUS.PENDING_ADD
              ? 'warning.main'
              : code.status === CODE_STATUS.PENDING_DELETE
                ? 'error.main'
                : 'default.main',
        pl: 1,
      }}
    >
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
              {code.name || code.description || t('unnamed')}
            </Typography>
            <Typography variant="caption" sx={{ ml: 1 }}>
              {t('pin_label')}: {code.code}
            </Typography>
          </Box>
        }
        secondary={null}
        slotProps={{
          primary: { component: 'div' },
          secondary: { component: 'div' },
        }}
      />
      <ListItemSecondaryAction>
        <Tooltip title={t('copy_code')}>
          <IconButton edge="end" aria-label="copy" onClick={() => onCopy(code.code)}>
            <ContentCopyIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title={t('edit_description')}>
          <IconButton edge="end" aria-label="edit" onClick={() => onEdit(code)}>
            <EditIcon />
          </IconButton>
        </Tooltip>

        <IconButton edge="end" aria-label="delete" onClick={() => onDelete(code.id)}>
          <DeleteIcon />
        </IconButton>
      </ListItemSecondaryAction>
    </ListItem>
  );
};
