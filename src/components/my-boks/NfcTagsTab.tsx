import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  IconButton,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  TextField,
  Alert,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import NfcIcon from '@mui/icons-material/Nfc';
import AddIcon from '@mui/icons-material/Add';
import { useTranslation } from 'react-i18next';
import { useNfcTags } from '../../hooks/useNfcTags';
import { BoksNfcTag } from '../../types/db';
import { NfcScanStatus } from '../../types/nfc';

export const NfcTagsTab = () => {
  const { t } = useTranslation(['common', 'settings']);
  const { tags, scanStatus, scannedUid, startScan, registerTag, unregisterTag, resetScan } =
    useNfcTags();

  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [tagName, setTagName] = useState('');

  const handleOpenAdd = () => {
    resetScan();
    setTagName('');
    setOpenAddDialog(true);
  };

  const handleCloseAdd = () => {
    setOpenAddDialog(false);
    resetScan();
  };

  const handleStartScan = () => {
    startScan();
  };

  const handleRegister = async () => {
    if (tagName.trim()) {
      try {
        await registerTag(tagName.trim());
        handleCloseAdd();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleDelete = async (tag: BoksNfcTag) => {
    if (confirm(t('common:confirm_delete'))) {
      try {
        await unregisterTag(tag);
      } catch (e) {
        console.error(e);
        alert(t('settings:nfc.error_delete_failed'));
      }
    }
  };

  // Auto-set default name when UID found
  useEffect(() => {
    if (scannedUid && !tagName) {
      setTagName(`Badge ${scannedUid.substring(0, 5)}`);
    }
  }, [scannedUid, tagName]);

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">{t('settings:nfc.title')}</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAdd}>
          {t('settings:nfc.add_tag')}
        </Button>
      </Box>

      {tags && tags.length > 0 ? (
        <List>
          {tags.map((tag) => (
            <ListItem
              key={tag.id}
              secondaryAction={
                <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(tag)}>
                  <DeleteIcon />
                </IconButton>
              }
            >
              <ListItemAvatar>
                <Avatar>
                  <NfcIcon />
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={tag.name}
                secondary={
                  <>
                    <Typography component="span" variant="body2" color="textPrimary">
                      {tag.uid}
                    </Typography>
                    <br />
                    {tag.last_seen_at
                      ? t('settings:nfc.last_seen', {
                          date: new Date(tag.last_seen_at).toLocaleString(),
                        })
                      : t('settings:nfc.never_seen')}
                  </>
                }
              />
            </ListItem>
          ))}
        </List>
      ) : (
        <Typography variant="body1" color="textSecondary" align="center" sx={{ mt: 4 }}>
          {t('settings:nfc.no_tags')}
        </Typography>
      )}

      {/* Add Tag Dialog */}
      <Dialog open={openAddDialog} onClose={handleCloseAdd} fullWidth maxWidth="sm">
        <DialogTitle>{t('settings:nfc.dialog_title')}</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              py: 2,
            }}
          >
            {scanStatus === NfcScanStatus.IDLE && (
              <Typography>{t('settings:nfc.instructions_idle')}</Typography>
            )}

            {scanStatus === NfcScanStatus.SCANNING && (
              <>
                <CircularProgress />
                <Typography>{t('settings:nfc.instructions_scanning')}</Typography>
              </>
            )}

            {scanStatus === NfcScanStatus.TIMEOUT && (
              <Alert severity="warning">{t('settings:nfc.error_timeout')}</Alert>
            )}

            {scanStatus === NfcScanStatus.ERROR && (
              <Alert severity="error">{t('settings:nfc.error_generic')}</Alert>
            )}

            {scanStatus === NfcScanStatus.ERROR_EXISTS && (
              <Alert severity="info">
                {t('settings:nfc.error_exists')}
                {scannedUid && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption">UID: {scannedUid}</Typography>
                    <Typography>{t('settings:nfc.instructions_exists_local')}</Typography>
                  </Box>
                )}
              </Alert>
            )}

            {(scanStatus === NfcScanStatus.FOUND ||
              scanStatus === NfcScanStatus.ERROR_EXISTS) &&
              scannedUid && (
                <Box sx={{ width: '100%', mt: 2 }}>
                  <Alert severity="success" sx={{ mb: 2 }}>
                    {t('settings:nfc.tag_found', { uid: scannedUid })}
                  </Alert>
                  <TextField
                    autoFocus
                    margin="dense"
                    label={t('settings:nfc.input_label')}
                    fullWidth
                    value={tagName}
                    onChange={(e) => setTagName(e.target.value)}
                  />
                </Box>
              )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAdd}>{t('common:cancel')}</Button>
          {scanStatus === NfcScanStatus.IDLE ||
          scanStatus === NfcScanStatus.TIMEOUT ||
          scanStatus === NfcScanStatus.ERROR ? (
            <Button onClick={handleStartScan} variant="contained">
              {t('settings:nfc.button_start_scan')}
            </Button>
          ) : null}
          {(scanStatus === NfcScanStatus.FOUND || scanStatus === NfcScanStatus.ERROR_EXISTS) && (
            <Button onClick={handleRegister} variant="contained" disabled={!tagName}>
              {t('settings:nfc.add_tag')}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};
