import { useState } from 'react';
import { db } from '../../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Box,
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
  SelectChangeEvent
} from '@mui/material';
import { ExpandMore } from '@mui/icons-material';

const DBTableViewer = ({ tableName }: { tableName: string }) => {
  const data = useLiveQuery(() => db.table(tableName).toArray(), [tableName]);

  if (!data) return <Typography>Loading...</Typography>;
  if (data.length === 0) return <Typography>No records found.</Typography>;

  return (
    <List>
      {data.map((item, index) => (
        <ListItem key={index} disablePadding>
          <Accordion sx={{ width: '100%' }}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography noWrap>
                {/* Try to find a reasonable title */}
                {/* @ts-expect-error - dynamic access */}
                {item.id || item.name || item.key || `Record ${index}`}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
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
            </AccordionDetails>
          </Accordion>
        </ListItem>
      ))}
    </List>
  );
};

export const DBEditor = () => {
  const [selectedTable, setSelectedTable] = useState<string>('');
  const tables = db.tables.map((t) => t.name);

  const handleChange = (event: SelectChangeEvent) => {
    setSelectedTable(event.target.value);
  };

  return (
    <Box sx={{ mt: 2 }}>
      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
        <InputLabel>Select Table</InputLabel>
        <Select value={selectedTable} label="Select Table" onChange={handleChange}>
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
