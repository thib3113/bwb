import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  TextField
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CachedIcon from '@mui/icons-material/Cached';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useDevice } from '../../hooks/useDevice';
import { StorageService } from '../../services/StorageService';
import { formatCode, generateCode } from '../../utils/codeUtils';
import { BoksCode, CODE_TYPE, CodeCreationData, UserRole } from '../../types';

interface AddCodeDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (codeData: CodeCreationData, overwriteCodeId?: string | null) => void;
  editingCode: BoksCode | null;
}

export const AddCodeDialog = ({ open, onClose, onSave, editingCode }: AddCodeDialogProps) => {
  const { t } = useTranslation(['codes', 'common']);
  const { activeDevice } = useDevice();
  const hasConfigurationKey = !!activeDevice?.configuration_key;
  const isAdmin = activeDevice?.role === UserRole.Owner || activeDevice?.role === UserRole.Admin;
  const [type, setType] = useState<CODE_TYPE>(CODE_TYPE.SINGLE);
  const [code, setCode] = useState('');
  const [name, setName] = useState(''); // Was description
  const [index, setIndex] = useState(0);
  const [uses, setUses] = useState(1); // Pour les codes multi-usages
  const [showCode, setShowCode] = useState(true);

  // Initialize form fields when editing a code or opening for new
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        if (editingCode) {
          setType(editingCode.type);
          setCode(editingCode.code);
          setName(editingCode.name || editingCode.description || '');
          setIndex(editingCode.index || 0);
          setUses(editingCode.uses || 1);
        } else {
          setType(CODE_TYPE.SINGLE);
          setCode(generateCode());
          setName('');
          setIndex(0);
          setUses(1);
        }
        setShowCode(true);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [editingCode, open]);

  // Load existing master indices when dialog opens or active device changes
  useEffect(() => {
    if (open && activeDevice?.id && type === CODE_TYPE.MASTER) {
      StorageService.loadCodes(activeDevice.id).then((loadedCodes) => {
        const masterIndices = loadedCodes
          .filter((c) => c.type === CODE_TYPE.MASTER && c.status !== 'pending_delete')
          .map((c) => c.index)
          .filter((idx): idx is number => idx !== undefined);

        const nextIndex = Math.max(...masterIndices, -1) + 1;
        setIndex(nextIndex);
      });
    }
  }, [open, activeDevice?.id, type]);

  const handleClose = () => {
    // Reset form
    setType(CODE_TYPE.SINGLE);
    setCode('');
    setName('');
    setIndex(0);
    setUses(1); // Réinitialiser le nombre d'utilisations
    // Removed setShowOverwriteDialog, setOverwriteCodeId
    onClose();
  };

  const handleSave = async () => {
    // Formater le code
    const formattedCode = formatCode(code);
    setCode(formattedCode);

    // Check for master code index conflict
    if (type === CODE_TYPE.MASTER && activeDevice?.id) {
      const loadedCodes = await StorageService.loadCodes(activeDevice.id);
      // Conflict Detection: Check if index exists
      const existingCode = loadedCodes.find(
        (c) =>
          c.type === CODE_TYPE.MASTER &&
          c.index === index &&
          c.status !== 'pending_delete' &&
          // Don't consider the code we're editing as a conflict
          (!editingCode || c.id !== editingCode.id)
      );

      if (existingCode) {
        // Since there's no explicit approval, overwrite directly
        onSave(
          { type, code: formattedCode, name, index, maxUses: uses },
          existingCode.id // Pass the ID of the conflicting code to overwrite
        );
        handleClose();
        return; // Exit to prevent further save calls
      }
    }

    // No conflict, proceed with save
    onSave(
      { type, code: formattedCode, name, index, maxUses: uses },
      editingCode ? editingCode.id : null
    );
    handleClose();
  };

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editingCode ? t('edit_code') : t('add_new')}</DialogTitle>
        <DialogContent>
          {!activeDevice?.configuration_key && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {t('config_key_missing')}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                label={t('pin_label')}
                value={code}
                onChange={(e) => setCode(e.currentTarget.value.trim().toUpperCase())}
                fullWidth
                type={showCode ? 'text' : 'password'}
                inputProps={{
                  maxLength: 6,
                  'data-testid': 'code-pin-input'
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle code visibility"
                        onClick={() => setShowCode(!showCode)}
                        edge="end"
                        size="small"
                      >
                        {showCode ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
              <IconButton
                onClick={() => setCode(generateCode())}
                aria-label={t('generate')}
                data-testid="generate-code-button"
              >
                <CachedIcon />
              </IconButton>
            </Box>
            <TextField
              label={t('description_label')}
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              placeholder={t('description_placeholder')}
              inputProps={{ 'data-testid': 'code-name-input' }}
              fullWidth
              required
            />
            <FormControl fullWidth>
              <InputLabel>{t('type_label')}</InputLabel>
              <Select
                value={type}
                onChange={(e) => setType((e.target as HTMLInputElement).value as CODE_TYPE)}
                label={t('type_label')}
                data-testid="code-type-select"
              >
                {/* Master code availability logic:
                 * If Admin: Can ONLY create Master Code IF configurationKey is present
                 * If User (Non-Admin): Can ALWAYS create Master Code (regardless of key)
                 */}
                {(!isAdmin || (isAdmin && hasConfigurationKey)) && (
                  <MenuItem value={CODE_TYPE.MASTER} data-testid="option-master">
                    {t('master_code')}
                  </MenuItem>
                )}
                <MenuItem value={CODE_TYPE.SINGLE} data-testid="option-single">
                  {t('single_use_code')}
                </MenuItem>
              </Select>
            </FormControl>
            {type === CODE_TYPE.MASTER && (
              <TextField
                label={`${t('index_label')}: ${index}`}
                type="number"
                value={index}
                onChange={(e) => setIndex(parseInt(e.currentTarget.value) || 0)}
                fullWidth
                disabled={!isAdmin} // If User (Non-Admin): Cannot edit Index (hide it or disable it)
                inputProps={{
                  min: 0,
                  max: 255,
                  'data-testid': 'code-index-input'
                }}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>{t('cancel')}</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            data-testid="save-code-button"
            startIcon={<AddIcon />}
            // Disable conditions
            // Name is mandatory for ALL code types now.
            disabled={!code || code.length !== 6 || name.trim() === ''}
          >
            {editingCode ? t('save') : t('generate')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
