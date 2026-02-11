import { useState } from 'react';
import { Box, Collapse, IconButton, Table, TableBody, TableCell, TableRow } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTranslation } from 'react-i18next';
import { formatLogDate, ParsedLogDisplay, translateKey } from './logUtils';

interface LogItemProps {
  log: ParsedLogDisplay; // Use ParsedLogDisplay here
}

export const LogItem = ({ log }: LogItemProps) => {
  const { t, i18n } = useTranslation('logs');
  const [isExpanded, setIsExpanded] = useState(false);

  const onToggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <>
      <TableRow>
        <TableCell title={log.fullDate}>{formatLogDate(log.timestamp, i18n.language)}</TableCell>
        <TableCell>{log.event}</TableCell>
        <TableCell>
          {(() => {
            // Create a copy of details and remove 'age' and 'timestamp' to check if there are other details
            const detailsWithoutAgeAndTimestamp = { ...log.details };
            delete detailsWithoutAgeAndTimestamp['age'];
            delete detailsWithoutAgeAndTimestamp['timestamp'];
            delete detailsWithoutAgeAndTimestamp['opcode'];
            const hasOtherDetails = Object.keys(detailsWithoutAgeAndTimestamp).length > 0;

            return hasOtherDetails ? (
              <IconButton aria-label="expand row" size="small" onClick={onToggleExpand}>
                <ExpandMoreIcon
                  style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                />
              </IconButton>
            ) : null;
          })()}
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={3}>
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1 }}>
              <Table size="small" aria-label="details">
                <TableBody>
                  {/* Fusion des détails parsés et bruts */}
                  {(() => {
                    // Use log.details directly, no need for log.raw.details as BoksLog doesn't have it
                    const combinedDetails: Record<string, unknown> = {
                      ...log.details
                    };

                    // Remove 'age' field from details as requested
                    delete combinedDetails['age'];
                    // Also remove 'timestamp' field from details as requested
                    delete combinedDetails['timestamp'];
                    delete combinedDetails['opcode'];

                    return Object.entries(combinedDetails).map(([key, value]) => (
                      <TableRow key={key}>
                        <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                          {translateKey(key, t)}
                        </TableCell>
                        <TableCell>
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </TableCell>
                      </TableRow>
                    ));
                  })()}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};
export type { ParsedLogDisplay };
