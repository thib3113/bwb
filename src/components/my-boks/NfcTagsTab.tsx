import React, { useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Switch,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import NfcIcon from '@mui/icons-material/Nfc';
import AddIcon from '@mui/icons-material/Add';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useTranslation } from 'react-i18next';
import { useNfcTags } from '../../hooks/useNfcTags';
import { BoksNfcTag } from '../../types/db';
import { NfcScanStatus } from '../../types/nfc';
import { useDevice } from '../../hooks/useDevice';
import { compareVersions } from '../../utils/version';

export const NfcTagsTab = () => {
  const { t, i18n } = useTranslation(['common', 'settings']);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tAny = t as any;
  const { activeDevice, toggleLaPoste } = useDevice();

  const { tags, scanStatus, scannedUid, startScan, registerTag, unregisterTag, resetScan } =
    useNfcTags();

  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [tagName, setTagName] = useState('');

  // Compatibility Checks
  const fwVersion = activeDevice?.software_revision || '0.0.0';
  const isLaPosteCompatible = compareVersions(fwVersion, '4.2.0') >= 0;
  const isNfcTagsCompatible = compareVersions(fwVersion, '4.3.3') >= 0;

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
    if (confirm(tAny('common:confirm_delete'))) {
      try {
        await unregisterTag(tag);
      } catch (e) {
        console.error(e);
        alert(t('settings:nfc.error_delete_failed'));
      }
    }
  };

  const handleLaPosteToggle = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (toggleLaPoste) {
        await toggleLaPoste(event.target.checked);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to update La Poste setting');
    }
  };

  const helpUrl =
    i18n.language === 'fr'
      ? 'https://github.com/thib3113/ha-boks/blob/main/documentation/FR/create_user_tag.md'
      : 'https://github.com/thib3113/ha-boks/blob/main/documentation/EN/create_user_tag.md';

  return (
    <Box sx={{ p: 2 }}>
      {/* La Poste Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          {t('settings:activate_la_poste')}
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={activeDevice?.la_poste_activated || false}
              onChange={handleLaPosteToggle}
              disabled={!isLaPosteCompatible}
            />
          }
          label={
            isLaPosteCompatible
              ? activeDevice?.la_poste_activated
                ? 'Activé'
                : 'Désactivé'
              : 'Non disponible'
          }
        />
        {!isLaPosteCompatible && (
          <Alert severity="warning" sx={{ mt: 1 }}>
            {t('settings:device_info.warnings.update_required_laposte')}
          </Alert>
        )}
      </Box>

      {/* NFC Tags Section */}
      <Box sx={{ opacity: isNfcTagsCompatible ? 1 : 0.6 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" data-testid="nfc-tags-title">
              {t('settings:nfc.title')}
            </Typography>
            {!isNfcTagsCompatible && (
              <Tooltip title="Help">
                <IconButton size="small" href={helpUrl} target="_blank" rel="noopener noreferrer">
                  <HelpOutlineIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenAdd}
            disabled={!isNfcTagsCompatible}
          >
            {t('settings:nfc.add_tag')}
          </Button>
        </Box>

        {!isNfcTagsCompatible && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {t('settings:device_info.warnings.update_required_nfc')}
          </Alert>
        )}

        {tags && tags.length > 0 ? (
          <List>
            {tags.map((tag) => (
              <ListItem
                key={tag.id}
                secondaryAction={
                  <IconButton
                    edge="end"
                    aria-label="delete"
                    onClick={() => handleDelete(tag)}
                    disabled={!isNfcTagsCompatible}
                  >
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
                            date: new Date(tag.last_seen_at).toLocaleString()
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
      </Box>

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
              py: 2
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

            {(scanStatus === NfcScanStatus.FOUND || scanStatus === NfcScanStatus.ERROR_EXISTS) &&
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
                    onChange={(e) => setTagName((e.target as HTMLInputElement).value)}
                    required
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
            <Button onClick={handleRegister} variant="contained" disabled={!tagName.trim()}>
              {t('settings:nfc.add_tag')}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};
