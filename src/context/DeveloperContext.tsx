import { useState, ReactNode } from 'react';
import { DeveloperContext } from './DeveloperContextTypes';

export const DeveloperProvider = ({ children }: { children: ReactNode }) => {
  const [isDeveloperMode, setIsDeveloperMode] = useState(() => {
    return localStorage.getItem('boks_developer_mode') === 'true';
  });

  const enableDeveloperMode = () => {
    setIsDeveloperMode(true);
    localStorage.setItem('boks_developer_mode', 'true');
  };

  const disableDeveloperMode = () => {
    setIsDeveloperMode(false);
    localStorage.setItem('boks_developer_mode', 'false');
  };

  return (
    <DeveloperContext.Provider
      value={{ isDeveloperMode, enableDeveloperMode, disableDeveloperMode }}
    >
      {children}
    </DeveloperContext.Provider>
  );
};
