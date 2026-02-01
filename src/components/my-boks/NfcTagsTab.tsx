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
        alert('Failed to delete tag');
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
        <Typography variant="h6">NFC Tags</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAdd}>
          Add Tag
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
                      ? `Last seen: ${new Date(tag.last_seen_at).toLocaleString()}`
                      : 'Never seen'}
                  </>
                }
              />
            </ListItem>
          ))}
        </List>
      ) : (
        <Typography variant="body1" color="textSecondary" align="center" sx={{ mt: 4 }}>
          No NFC tags registered.
        </Typography>
      )}

      {/* Add Tag Dialog */}
      <Dialog open={openAddDialog} onClose={handleCloseAdd} fullWidth maxWidth="sm">
        <DialogTitle>Add NFC Tag</DialogTitle>
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
              <Typography>Click "Start Scan" and present the tag to the Boks.</Typography>
            )}

            {scanStatus === NfcScanStatus.SCANNING && (
              <>
                <CircularProgress />
                <Typography>Scanning... (6s)</Typography>
              </>
            )}

            {scanStatus === NfcScanStatus.TIMEOUT && (
              <Alert severity="warning">Scan timed out. Please try again.</Alert>
            )}

            {scanStatus === NfcScanStatus.ERROR && (
              <Alert severity="error">An error occurred during scan.</Alert>
            )}

            {scanStatus === NfcScanStatus.ERROR_EXISTS && (
              <Alert severity="info">
                Tag already exists on device!
                {scannedUid && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption">UID: {scannedUid}</Typography>
                    <Typography>
                      You can register it locally if it's not in the list.
                    </Typography>
                  </Box>
                )}
              </Alert>
            )}

            {(scanStatus === NfcScanStatus.FOUND ||
              scanStatus === NfcScanStatus.ERROR_EXISTS) &&
              scannedUid && (
                <Box sx={{ width: '100%', mt: 2 }}>
                  <Alert severity="success" sx={{ mb: 2 }}>
                    Tag Found: {scannedUid}
                  </Alert>
                  <TextField
                    autoFocus
                    margin="dense"
                    label="Tag Name"
                    fullWidth
                    value={tagName}
                    onChange={(e) => setTagName(e.target.value)}
                  />
                </Box>
              )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAdd}>Cancel</Button>
          {scanStatus === NfcScanStatus.IDLE ||
          scanStatus === NfcScanStatus.TIMEOUT ||
          scanStatus === NfcScanStatus.ERROR ? (
            <Button onClick={handleStartScan} variant="contained">
              Start Scan
            </Button>
          ) : null}
          {(scanStatus === NfcScanStatus.FOUND || scanStatus === NfcScanStatus.ERROR_EXISTS) && (
            <Button onClick={handleRegister} variant="contained" disabled={!tagName}>
              Add Tag
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};
