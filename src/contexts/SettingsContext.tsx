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
  biometricEnabled: boolean;
  biometricTimeout: number;
  appLockEnabled: boolean;
  useFaceId: boolean;
  wakeUpTime: string;
  bedTime: string;
  workStartTime: string;
  workEndTime: string;
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
  biometricEnabled: false,
  biometricTimeout: 0,
  appLockEnabled: false,
  useFaceId: false,
  wakeUpTime: '07:00',
  bedTime: '22:00',
  workStartTime: '09:00',
  workEndTime: '17:00',
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
      console.log('[SettingsContext] Loading settings...');
      const storedSettings = await AsyncStorage.getItem('app_settings');
      console.log('[SettingsContext] Stored settings:', storedSettings);
      
      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings);
        console.log('[SettingsContext] Merged settings:', {
          ...DEFAULT_SETTINGS,
          ...parsedSettings
        });
        setSettings({ ...DEFAULT_SETTINGS, ...parsedSettings });
      } else {
        console.log('[SettingsContext] No stored settings, using defaults');
      }
    } catch (error) {
      console.error('[SettingsContext] Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function updateSettings(newSettings: Partial<AppSettings>) {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    
    try {
      await AsyncStorage.setItem('app_settings', JSON.stringify(updatedSettings));
    } catch (error) {
      setSettings(settings);
      console.error('[SettingsContext] Failed to save settings:', error);
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