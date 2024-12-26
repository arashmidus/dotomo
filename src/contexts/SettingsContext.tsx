import { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface NotificationPreferences {
  enabled: boolean;
  reminderTiming: number;
  sound: boolean;
  vibration: boolean;
}

interface AppSettings {
  notifications: NotificationPreferences;
  theme: 'light' | 'dark' | 'system';
  defaultPriority: 'low' | 'medium' | 'high';
}

const DEFAULT_SETTINGS: AppSettings = {
  notifications: {
    enabled: true,
    reminderTiming: 1,
    sound: true,
    vibration: true,
  },
  theme: 'system',
  defaultPriority: 'medium',
};

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  isLoading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const storedSettings = await AsyncStorage.getItem('app_settings');
      if (storedSettings) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(storedSettings) });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function updateSettings(newSettings: Partial<AppSettings>) {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      await AsyncStorage.setItem('app_settings', JSON.stringify(updatedSettings));
      setSettings(updatedSettings);
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  }

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, isLoading }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
} 