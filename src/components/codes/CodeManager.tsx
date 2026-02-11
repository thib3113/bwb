import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDevice } from '../../hooks/useDevice';
import { BoksCode } from '../../types';
import { AddCodeDialog } from './AddCodeDialog';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  IconButton,
  Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import SyncIcon from '@mui/icons-material/Sync';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useCodeLogic } from '../../hooks/useCodeLogic';
import { CodeList } from './CodeList';
import { useTaskContext } from '../../hooks/useTaskContext';

interface CodeManagerProps {
  showAddForm?: boolean;
  setShowAddForm?: (show: boolean) => void;
  showNotification: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  hideNotification: () => void;
}

export const CodeManager = ({
  showAddForm,
  setShowAddForm,
  showNotification,
  hideNotification
}: CodeManagerProps) => {
  const { t } = useTranslation(['codes', 'common']);
  const { activeDevice } = useDevice();
  const { tasks, syncTasks } = useTaskContext();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [expandedAccordions, setExpandedAccordions] = useState<Set<string>>(
    new Set(['permanent', 'temporary'])
  ); // 'permanent', 'temporary'
  const [editingCode, setEditingCode] = useState<BoksCode | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const autoSync = activeDevice?.auto_sync ?? false;
  const pendingCount = tasks.filter((t) => t.status === 'pending' && t.deviceId === activeDevice?.id).length;
  const shouldShowSyncButton = !autoSync && pendingCount > 0;

  const {
    masterCodes,
    temporaryCodes,
    codeCount,
    refreshCodeCount,
    hasIndexConflict,
    handleAddCode,
    handleDeleteCode,
    deriveCodeMetadata,
    getFilteredCodes,
    handleCopyCode
  } = useCodeLogic(showNotification, hideNotification);

  // Handle editing a code
  const handleEditCode = useCallback((code: BoksCode) => {
    setEditingCode(code);
    setIsAddDialogOpen(true);
  }, []);

  const handleRefreshOrSync = async () => {
    setIsRefreshing(true);
    try {
      if (shouldShowSyncButton) {
        // Trigger sync first
        await syncTasks();
        // Give it a moment to process or just refresh count immediately?
        // Task processing is async in background.
        // We can wait a bit or just refresh count.
        // If we refresh count immediately, it might not reflect changes yet if tasks are slow.
        // But user sees something happening.
      }
      await refreshCodeCount();
    } catch (error) {
      console.error('Failed to refresh/sync:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">
          {t('title')} {codeCount && `(Total: ${codeCount.total})`}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant={shouldShowSyncButton ? "contained" : "outlined"}
            color={shouldShowSyncButton ? "warning" : "primary"}
            startIcon={shouldShowSyncButton ? <SyncIcon /> : <RefreshIcon />}
            onClick={handleRefreshOrSync}
            disabled={isRefreshing}
            size="small"
          >
            {shouldShowSyncButton
              ? t('sync_pending', { count: pendingCount })
              : t('refresh')}
          </Button>
          <IconButton
            color="primary"
            onClick={() => setIsAddDialogOpen(true)}
            aria-label={t('add_new')}
            data-testid="add-code-button"
            size="small"
          >
            <AddIcon />
          </IconButton>
        </Box>
      </Box>

      {activeDevice && (
        <Typography variant="subtitle1" color="textSecondary" sx={{ mb: 2 }}>
          {activeDevice.friendly_name || activeDevice.ble_name}
        </Typography>
      )}

      {/* Add Code Dialog */}
      <AddCodeDialog
        open={isAddDialogOpen || showAddForm || false}
        onClose={() => {
          setIsAddDialogOpen(false);
          if (setShowAddForm) setShowAddForm(false);
          setEditingCode(null);
        }}
        onSave={handleAddCode}
        editingCode={editingCode}
      />

      {/* Permanent Codes Accordion */}
      <Accordion
        expanded={expandedAccordions.has('permanent')}
        onChange={() => {
          setExpandedAccordions((prev) => {
            const newSet = new Set(prev);
            if (newSet.has('permanent')) {
              newSet.delete('permanent');
            } else {
              newSet.add('permanent');
            }
            return newSet;
          });
        }}
        elevation={0}
        sx={{ backgroundColor: 'transparent', width: '100%' }}
        disableGutters
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>
            {t('permanent_codes')} ({masterCodes.length}
            {codeCount && ` / ${codeCount.master} ${t('codes:on_device_count')}`})
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ padding: '0 0 0 0 !important' }}>
          <CodeList
            codes={getFilteredCodes('master')}
            deriveCodeMetadata={deriveCodeMetadata}
            hasIndexConflict={hasIndexConflict}
            onCopy={handleCopyCode}
            onEdit={handleEditCode}
            onDelete={handleDeleteCode}
          />
        </AccordionDetails>
      </Accordion>

      {/* Temporary Codes Accordion */}
      <Accordion
        expanded={expandedAccordions.has('temporary')}
        onChange={() => {
          setExpandedAccordions((prev) => {
            const newSet = new Set(prev);
            if (newSet.has('temporary')) {
              newSet.delete('temporary');
            } else {
              newSet.add('temporary');
            }
            return newSet;
          });
        }}
        elevation={0}
        sx={{ backgroundColor: 'transparent', width: '100%' }}
        disableGutters
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>
            {t('temporary_codes')} ({temporaryCodes.length}
            {codeCount && ` / ${codeCount.single} ${t('codes:on_device_count')}`})
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ padding: '0 0 0 0 !important' }}>
          <CodeList
            codes={getFilteredCodes('temporary')}
            deriveCodeMetadata={deriveCodeMetadata}
            onCopy={handleCopyCode}
            onEdit={handleEditCode}
            onDelete={handleDeleteCode}
          />
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};
