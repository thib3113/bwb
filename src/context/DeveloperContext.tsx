import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface DeveloperContextType {
  isDeveloperMode: boolean;
  enableDeveloperMode: () => void;
  disableDeveloperMode: () => void;
}

const DeveloperContext = createContext<DeveloperContextType | undefined>(undefined);

export const useDeveloperContext = () => {
  const context = useContext(DeveloperContext);
  if (!context) {
    throw new Error('useDeveloperContext must be used within a DeveloperProvider');
  }
  return context;
};

export const DeveloperProvider = ({ children }: { children: ReactNode }) => {
  const [isDeveloperMode, setIsDeveloperMode] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('boks_developer_mode');
    if (stored === 'true') {
      setIsDeveloperMode(true);
    }
  }, []);

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
