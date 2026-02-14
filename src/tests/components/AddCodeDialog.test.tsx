import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddCodeDialog } from '../../components/codes/AddCodeDialog';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CODE_TYPE, UserRole } from '../../types';

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockActiveDevice = {
  id: 'device-1',
  role: UserRole.Owner,
  configuration_key: 'key',
};

vi.mock('../../hooks/useDevice', () => ({
  useDevice: () => ({
    activeDevice: mockActiveDevice,
  }),
}));

vi.mock('../../services/StorageService', () => ({
  StorageService: {
    loadCodes: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../../utils/codeUtils', () => ({
  formatCode: (c: string) => c,
  generateCode: () => '123456',
}));

describe('AddCodeDialog', () => {
  const onSave = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('defaults to Single Use code type', async () => {
    render(
      <AddCodeDialog
        open={true}
        onClose={onClose}
        onSave={onSave}
        editingCode={null}
      />
    );

    // Wait for effect to run
    await waitFor(() => {
      expect(screen.getByTestId('code-type-select')).toBeInTheDocument();
    });

    // Check default value is Single Use
    // The Select triggers a hidden input with the value.
    const input = screen.getByTestId('code-type-select').querySelector('input');
    expect(input).toHaveValue('single');
  });

  it('does not show Multi Use option', async () => {
    render(
      <AddCodeDialog
        open={true}
        onClose={onClose}
        onSave={onSave}
        editingCode={null}
      />
    );

    // Open the select
    const select = screen.getByTestId('code-type-select');
    fireEvent.mouseDown(select.querySelector('[role="combobox"]') || select);

    // Check available options
    // Material UI renders options in a portal, but queries usually find them.
    // Or we can check if they are NOT in the document if not open, but here we opened it.

    // Check Single is present
    expect(screen.getByTestId('option-single')).toBeInTheDocument();

    // Check Multi is NOT present
    expect(screen.queryByTestId('option-multi')).not.toBeInTheDocument();

    // Check Master is present (since we are owner with key)
    expect(screen.getByTestId('option-master')).toBeInTheDocument();
  });

  it('does not show Uses input for Single code', async () => {
    render(
      <AddCodeDialog
        open={true}
        onClose={onClose}
        onSave={onSave}
        editingCode={null}
      />
    );

    expect(screen.queryByTestId('code-uses-input')).not.toBeInTheDocument();
  });
});
