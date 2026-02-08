import { List } from '@mui/material';
import { CodeItem } from './CodeItem';
import { BoksCode, CodeMetadata } from '../../types';

interface CodeListProps {
  codes: BoksCode[];
  deriveCodeMetadata: (code: BoksCode) => CodeMetadata;
  hasIndexConflict?: (index: number | undefined, currentCodeId: string) => boolean;
  onCopy: (code: string) => void;
  onEdit: (code: BoksCode) => void;
  onDelete: (id: string) => void;
}

export const CodeList = ({
  codes,
  deriveCodeMetadata,
  hasIndexConflict,
  onCopy,
  onEdit,
  onDelete
}: CodeListProps) => {
  return (
    <List>
      {codes.map((code) => (
        <CodeItem
          key={code.id}
          code={code}
          metadata={deriveCodeMetadata(code)}
          hasIndexConflict={hasIndexConflict ? hasIndexConflict(code.index, code.id) : false}
          onCopy={onCopy}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </List>
  );
};
