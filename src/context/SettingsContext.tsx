import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { SettingsContext } from './Contexts';
import { Settings } from '../types';
import { StorageService } from '../services/StorageService';

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider = ({ children }: SettingsProviderProps) => {
  const [settings, setSettings] = useState<Settings>({});
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from DB on init
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setSettings({});
        setIsLoaded(true);
      } catch (e) {
        console.error('Failed to load settings from DB', e);
        setIsLoaded(true); // Proceed anyway
      }
    };

    loadSettings();
  }, []);

  const updateSetting = useCallback(async (key: keyof Settings, value: unknown) => {
    // Optimistic update
    setSettings((prev) => ({
      ...prev,
      [key]: value
    }));

    // Persist to DB
    try {
      await StorageService.saveSetting(key, value);
    } catch (e) {
      console.error(`Failed to persist setting ${key}`, e);
    }
  }, []);

  const value = useMemo(
    () => ({
      settings,
      updateSetting
    }),
    [settings, updateSetting]
  );

  if (!isLoaded) return null;

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};
