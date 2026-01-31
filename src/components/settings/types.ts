export type SettingsConfig = {
  language: string;
  theme: string;
  deviceNames: Record<string, string>;
  configurationKeys: Record<string, string>;
  doorPinCodes: Record<string, string>;
  autoImport: boolean;
};
