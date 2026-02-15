import { useState } from 'react';
import {
  Box,
  Button,
  Collapse,
  Divider,
  IconButton,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  Tooltip,
  Typography
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTranslation } from 'react-i18next';
import { BoksCode } from '../../types';
import { CODE_STATUS } from '../../constants/codeStatus';
import { formatRelativeTime } from '../../utils/dateUtils';

interface CodeItemProps {
  code: BoksCode;
  metadata: {
    lastUsed?: Date;
    used?: boolean;
    usedDate?: Date;
  };
  hasIndexConflict?: boolean;
  onCopy: (code: string) => void;
  onEdit: (code: BoksCode) => void;
  onDelete: (id: string) => void;
}

export const CodeItem = ({ code, metadata, onCopy, onEdit, onDelete }: CodeItemProps) => {
  const { t, i18n } = useTranslation(['codes', 'common']);
  const [isExpanded, setIsExpanded] = useState(false);

  const isPendingDelete = code.status === CODE_STATUS.PENDING_DELETE;
  const isUsed = metadata.used;
  const lastUsedDate = metadata.usedDate || metadata.lastUsed;

  const isDimmed = isPendingDelete || isUsed;

  const toggleExpand = () => setIsExpanded(!isExpanded);

  return (
    <Box component="div" sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      <ListItem
        divider={false}
        data-testid={`code-item-${code.code}`}
        data-status={code.status}
        sx={{
          cursor: 'pointer',
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
          pr: 12
        }}
        component="div"
        onClick={toggleExpand}
      >
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
              <Typography
                variant="body1"
                sx={{
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  flexShrink: 1,
                  minWidth: 0
                }}
              >
                {code.name || code.description || t('codes:unnamed')}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  ml: 1,
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                {t('codes:pin_label')}: {code.code}
              </Typography>
            </Box>
          }
          disableTypography
        />
        <ListItemSecondaryAction>
          <Tooltip title={t('codes:copy_code')}>
            <IconButton
              edge="end"
              aria-label="copy"
              onClick={(e) => {
                e.stopPropagation();
                onCopy(code.code);
              }}
              sx={{ mr: 1 }}
            >
              <ContentCopyIcon />
            </IconButton>
          </Tooltip>

          <IconButton
            edge="end"
            aria-label={isExpanded ? 'collapse' : 'expand'}
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand();
            }}
            sx={{
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s'
            }}
          >
            <ExpandMoreIcon />
          </IconButton>
        </ListItemSecondaryAction>
      </ListItem>

      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
        <Box
          sx={{
            pl: 4,
            pr: 2,
            pb: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            borderLeft: '4px solid transparent',
            ml: 0
          }}
        >
          {/* Full Description */}
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {code.description || code.name || t('codes:unnamed')}
          </Typography>

          {/* Last Used Date */}
          {lastUsedDate && (
            <Typography variant="caption" color="text.secondary">
              {t('codes:last_used')}: {formatRelativeTime(new Date(lastUsedDate), i18n.language)}
            </Typography>
          )}

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 1, mt: 1, justifyContent: 'flex-end' }}>
            <Button
              startIcon={<EditIcon />}
              size="small"
              onClick={() => onEdit(code)}
              data-testid={`edit-code-${code.code}`}
            >
              {t('common:edit')}
            </Button>
            <Button
              startIcon={<DeleteIcon />}
              size="small"
              color="error"
              onClick={() => onDelete(code.id)}
              data-testid={`delete-code-${code.code}`}
            >
              {t('common:delete')}
            </Button>
          </Box>
        </Box>
      </Collapse>
      <Divider />
    </Box>
  );
};
