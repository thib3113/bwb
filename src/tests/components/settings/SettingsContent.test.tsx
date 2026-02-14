import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { SettingsContent } from '../../../components/settings/SettingsContent';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { LANGUAGES } from '../../../utils/constants';

// Mock useTheme
vi.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({
    mode: 'system',
    setThemeMode: vi.fn(),
  }),
}));

// Mock react-i18next
const changeLanguageMock = vi.fn();

vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>();
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => key,
      i18n: {
        language: 'en',
        resolvedLanguage: 'en',
        changeLanguage: changeLanguageMock,
      },
    }),
  };
});

describe('SettingsContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should change language immediately when selected', async () => {
    render(<SettingsContent />);

    // MUI Select is tricky. Let's find the combobox.
    // Since getByLabelText failed, we'll try finding by role.
    // There are two comboboxes (Language and Theme). Language is likely the first one.
    const comboboxes = screen.getAllByRole('combobox');
    const languageSelect = comboboxes[0];

    // Verify it's the right one by checking its text content (current value)
    expect(languageSelect).toHaveTextContent('language.english');

    // Open the dropdown
    fireEvent.mouseDown(languageSelect);

    // Find the option for French in the listbox that appears
    // MUI renders the listbox in a portal, typically at the end of the document body
    // Wait for the listbox to appear
    const listbox = await screen.findByRole('listbox');
    const frenchOption = within(listbox).getByText('language.french');

    fireEvent.click(frenchOption);

    // Expect changeLanguage to be called immediately with 'fr'
    await waitFor(() => {
      expect(changeLanguageMock).toHaveBeenCalledWith(LANGUAGES.FR);
    });
  });
});
