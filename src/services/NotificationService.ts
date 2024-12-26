import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { generateReminder } from './LLMService';
import { LoggingService } from './LoggingService';
import { Todo } from '../contexts/TodoContext';
import { NotificationPreferences } from '../contexts/SettingsContext';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export class NotificationService {
  static async sendImmediateNotification(todo: Todo, settings: NotificationPreferences) {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        LoggingService.warn('Notification permissions not granted');
        return;
      }

      // Get AI-generated reminder using LLM service
      const reminder = await generateReminder(todo);
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Task Reminder: ${todo.title}`,
          body: reminder,
          data: { todoId: todo.id },
          sound: settings.sound,
          vibrate: settings.vibration ? [0, 250, 250, 250] : undefined,
          badge: 1,
        },
        trigger: null, // immediate notification
      });

      LoggingService.info('LLM notification sent', {
        todoId: todo.id,
        reminderText: reminder,
      });
    } catch (error) {
      LoggingService.error('Failed to send LLM notification', { 
        error,
        todoId: todo.id 
      });
    }
  }

  static async requestPermissions() {
    if (Platform.OS === 'web') return false;
    
    if (!Device.isDevice) {
      LoggingService.warn('Must use physical device for notifications');
      return false;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      if (existingStatus === 'granted') return true;

      const { status } = await Notifications.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      LoggingService.error('Failed to request permissions', { error });
      return false;
    }
  }

  static async cancelNotification(todoId: string) {
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      const toCancel = notifications.filter(n => n.content.data?.todoId === todoId);
      
      await Promise.all(
        toCancel.map(n => Notifications.cancelScheduledNotificationAsync(n.identifier))
      );
    } catch (error) {
      console.error('Failed to cancel notification:', error);
    }
  }
} 