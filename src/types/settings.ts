export interface NotificationPreferences {
  enabled: boolean;
  reminderTiming: number; // hours before due date
  sound: boolean;
  vibration: boolean;
}

export interface AppSettings {
  notifications: NotificationPreferences;
  theme: 'light' | 'dark' | 'system';
  defaultPriority: 'low' | 'medium' | 'high';
  defaultReminderTime: number;
  showCompletedTodos: boolean;
} 