import { createContext } from 'react';
import {
  BLEContextType,
  BoksContextType,
  CodeContextType,
  DeviceContextType,
  DeviceLogContextType,
  ErrorContextType,
  LogContextType,
  SessionContextType,
  SettingsContextType,
  TaskContextType,
  ThemeContextType
} from './types';

export const BLEContext = createContext<BLEContextType | undefined>(undefined);
export const BoksContext = createContext<BoksContextType | undefined>(undefined);
export const CodeContext = createContext<CodeContextType | undefined>(undefined);
export const DeviceContext = createContext<DeviceContextType | undefined>(undefined);
export const DeviceLogContext = createContext<DeviceLogContextType | undefined>(undefined);
export const ErrorContext = createContext<ErrorContextType | undefined>(undefined);
export const LogContext = createContext<LogContextType | undefined>(undefined);
export const SessionContext = createContext<SessionContextType | undefined>(undefined);
export const SettingsContext = createContext<SettingsContextType | undefined>(undefined);
export const TaskContext = createContext<TaskContextType | undefined>(undefined);
export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
