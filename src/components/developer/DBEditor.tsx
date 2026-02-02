import { useState } from 'react';
import { db } from '../../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
  List,
  ListItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  SelectChangeEvent,
  TextField,
  IconButton,
  Stack,
  Alert,
} from '@mui/material';
import { ExpandMore, Edit, Delete, Save, Cancel } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

const DBRowEditor = ({
  tableName,
  item,
  primaryKey,
}: {
  tableName: string;
  item: any;
  primaryKey: any;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(JSON.stringify(item, null, 2));
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    try {
      const parsed = JSON.parse(editValue);
      await db.table(tableName).put(parsed);
      setIsEditing(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JSON');
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this record?')) {
      await db.table(tableName).delete(primaryKey);
    }
  };

  if (isEditing) {
    return (
      <Box sx={{ p: 1 }}>
        <TextField
          fullWidth
          multiline
          minRows={3}
          value={editValue}
          onChange={(e) => setEditValue((e.target as HTMLInputElement).value)}
          variant="outlined"
          size="small"
          sx={{ fontFamily: 'monospace', mb: 1 }}
        />
        {error && (
          <Alert severity="error" sx={{ mb: 1 }}>
            {error}
          </Alert>
        )}
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button
            startIcon={<Cancel />}
            onClick={() => {
              setIsEditing(false);
              setEditValue(JSON.stringify(item, null, 2));
              setError(null);
            }}
            size="small"
          >
            Cancel
          </Button>
          <Button startIcon={<Save />} onClick={handleSave} variant="contained" size="small">
            Save
          </Button>
        </Stack>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
        <IconButton size="small" onClick={() => setIsEditing(true)}>
          <Edit fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={handleDelete} color="error">
          <Delete fontSize="small" />
        </IconButton>
      </Box>
      <Box
        component="pre"
        sx={{
          overflowX: 'auto',
          fontSize: '0.75rem',
          m: 0,
          p: 1,
          bgcolor: 'action.hover',
          borderRadius: 1,
        }}
      >
        {JSON.stringify(item, null, 2)}
      </Box>
    </Box>
  );
};

const DBTableViewer = ({ tableName }: { tableName: string }) => {
  const { t } = useTranslation(['settings']);
  const data = useLiveQuery(() => db.table(tableName).toArray(), [tableName]);
  const table = db.table(tableName);
  const primKeyName = table.schema.primKey.name;

  if (!data) return <Typography>{t('settings:developer.loading')}</Typography>;
  if (data.length === 0) return <Typography>{t('settings:developer.no_records')}</Typography>;

  return (
    <List>
      {data.map((item, index) => {
        // @ts-expect-error - dynamic access
        const pk = item[primKeyName];

        return (
          <ListItem key={pk || index} disablePadding>
            <Accordion sx={{ width: '100%' }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography noWrap>
                  {/* Try to find a reasonable title */}
                  {/* @ts-expect-error - dynamic access */}
                  {item.id || item.name || item.key || `Record ${index}`}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <DBRowEditor tableName={tableName} item={item} primaryKey={pk} />
              </AccordionDetails>
            </Accordion>
          </ListItem>
        );
      })}
    </List>
  );
};

export const DBEditor = () => {
  const { t } = useTranslation(['settings']);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const tables = db.tables.map((t) => t.name);

  const handleChange = (event: SelectChangeEvent) => {
    setSelectedTable(event.target.value);
  };

  return (
    <Box sx={{ mt: 2 }}>
      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
        <InputLabel>{t('settings:developer.select_table')}</InputLabel>
        <Select
          value={selectedTable}
          label={t('settings:developer.select_table')}
          onChange={handleChange}
        >
          {tables.map((table) => (
            <MenuItem key={table} value={table}>
              {table}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {selectedTable && <DBTableViewer tableName={selectedTable} />}
    </Box>
  );
};
