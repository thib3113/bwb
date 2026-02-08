import { createContext, useContext } from 'react';

export interface DeveloperContextType {
  isDeveloperMode: boolean;
  enableDeveloperMode: () => void;
  disableDeveloperMode: () => void;
}

export const DeveloperContext = createContext<DeveloperContextType | undefined>(undefined);

export const useDeveloperContext = () => {
  const context = useContext(DeveloperContext);
  if (!context) {
    throw new Error('useDeveloperContext must be used within a DeveloperProvider');
  }
  return context;
};
