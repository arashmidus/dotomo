import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSettings } from '../types/settings';

const SETTINGS_KEY = 'app_settings';

const DEFAULT_SETTINGS: AppSettings = {
  notifications: {
    enabled: true,
    reminderTiming: 1, // 1 hour before
    sound: true,
    vibration: true,
  },
  theme: 'system',
  defaultPriority: 'medium',
  defaultReminderTime: 1,
  showCompletedTodos: true,
};

export class SettingsService {
  static async getSettings(): Promise<AppSettings> {
    try {
      const settings = await AsyncStorage.getItem(SETTINGS_KEY);
      return settings ? { ...DEFAULT_SETTINGS, ...JSON.parse(settings) } : DEFAULT_SETTINGS;
    } catch (error) {
      console.error('Failed to load settings:', error);
      return DEFAULT_SETTINGS;
    }
  }

  static async updateSettings(settings: Partial<AppSettings>): Promise<void> {
    try {
      const currentSettings = await this.getSettings();
      const newSettings = { ...currentSettings, ...settings };
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  }
} 