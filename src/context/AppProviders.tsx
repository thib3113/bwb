import { ReactNode } from 'react';
import { AppThemeProvider } from './ThemeContext';
import { DeveloperProvider } from './DeveloperContext';
import { SettingsProvider } from './SettingsContext';
import { DeviceProvider } from './DeviceContext';
import { LogProvider } from './LogContext';
import { BLEProvider } from './BLEContext';
import { BoksProvider } from './BoksContext';
import { ErrorProvider } from './ErrorContext';
import { SessionProvider } from './SessionContext';
import { TaskProvider } from './TaskContext';
import { CodeProvider } from './CodeContext';
import { DeviceLogProvider } from './DeviceLogContext';

interface AppProvidersProps {
  children: ReactNode;
}

export const AppProviders = ({ children }: AppProvidersProps) => {
  return (
    <AppThemeProvider>
      <DeveloperProvider>
        <SettingsProvider>
          <DeviceProvider>
            <LogProvider>
              <BLEProvider>
                <BoksProvider>
                  <ErrorProvider>
                    <SessionProvider>
                      <TaskProvider>
                        <CodeProvider>
                          <DeviceLogProvider>{children}</DeviceLogProvider>
                        </CodeProvider>
                      </TaskProvider>
                    </SessionProvider>
                  </ErrorProvider>
                </BoksProvider>
              </BLEProvider>
            </LogProvider>
          </DeviceProvider>
        </SettingsProvider>
      </DeveloperProvider>
    </AppThemeProvider>
  );
};
