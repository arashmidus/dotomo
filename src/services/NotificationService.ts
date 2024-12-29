import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { generateReminder, generateTimingRecommendation } from './LLMService';
import { LoggingService } from './LoggingService';
import { Todo } from '../contexts/TodoContext';
// import { NotificationPreferences } from '../contexts/SettingsContext';
import { format } from 'date-fns';
import { NotificationPreferences } from '../types/settings';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export class NotificationService {
  static async sendImmediateNotification(todo: Todo, settings: NotificationPreferences) {
    console.log('⚠️ WARNING: Using immediate notification - should only be used for testing');
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
          title: `[TEST] Task Reminder: ${todo.title}`,
          body: `[TEST] ${reminder}`,
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

  static async scheduleSmartNotification(todo: Todo, notificationPrefs: NotificationPreferences) {
    try {
      console.log('\n🚀 STARTING SMART NOTIFICATION SCHEDULING...');
      
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.log('❌ No notification permissions!'); // Debug log
        LoggingService.warn('Notification permissions not granted');
        return;
      }

      console.log('✅ Permissions OK, getting LLM recommendations...'); // Debug log

      // Get AI-generated timing recommendation
      const timing = await generateTimingRecommendation(todo);
      console.log('📊 Received LLM timing:', timing);
      
      // Get AI-generated reminder text
      const reminder = await generateReminder(todo);
      
      // Parse the recommended time
      const [hours, minutes] = timing.recommendedTime.split(':').map(Number);
      
      // Create notification time based on due date
      const notificationTime = new Date(todo.dueDate);
      notificationTime.setHours(hours);
      notificationTime.setMinutes(minutes);
      notificationTime.setSeconds(0);
      notificationTime.setMilliseconds(0);

      // Safety check - ensure notification is at least 1 minute in the future
      const now = new Date();
      if (notificationTime <= now) {
        console.log('⚠️ Warning: Notification time was in the past or too soon');
        // Move to tomorrow
        notificationTime.setDate(notificationTime.getDate() + 1);
      }

      // Double check we're not scheduling too soon
      if (notificationTime.getTime() - now.getTime() < 60000) { // 60000ms = 1 minute
        throw new Error('Notification time too soon - must be at least 1 minute in the future');
      }

      console.log('🕒 Scheduling notification for:', notificationTime.toLocaleString());

      console.log('🕒 Notification scheduling details:', {
        currentTime: new Date().toLocaleString(),
        dueDate: new Date(todo.dueDate).toLocaleString(),
        recommendedTime: timing.recommendedTime,
        finalNotificationTime: notificationTime.toLocaleString()
      });

      console.log('\n📅 TRIGGER DETAILS 📅');
      console.log('------------------');
      console.log(`🎯 Trigger Type: date`);
      console.log(`⏰ Scheduled For: ${format(notificationTime, 'PPP HH:mm:ss')}`);
      console.log('------------------\n');

      // Add debug log
      console.log('Scheduling for timestamp:', notificationTime.getTime(), 'Current time:', Date.now());

      // Before scheduling, log intended time
      console.log('\n🎯 SCHEDULING ATTEMPT:');
      console.log('Intended time:', notificationTime.toLocaleString());

      // Calculate seconds from now until notification time
      const secondsUntilNotification = Math.floor((notificationTime.getTime() - Date.now()) / 1000);

      console.log('Using seconds-based trigger:', {
        secondsUntilNotification,
        fromTime: new Date().toLocaleString(),
        targetTime: notificationTime.toLocaleString()
      });

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Task Reminder: ${todo.title}`,
          body: `${reminder}`,
          data: { 
            todoId: todo.id,
            timing: timing.reasoning,
            intendedTime: notificationTime.getTime()
          },
          sound: notificationPrefs.sound,
          vibrate: notificationPrefs.vibration ? [0, 250, 250, 250] : undefined,
          badge: 1,
        },
        trigger: {
          type: 'timeInterval',  // Changed from 'date' to 'timeInterval'
          seconds: secondsUntilNotification,  // Use seconds from now
          channelId: Platform.OS === 'android' ? 'default' : undefined,
        },
      });

      // Add this debug log right after scheduling
      const scheduledNotifs = await Notifications.getAllScheduledNotificationsAsync();
      const thisNotif = scheduledNotifs.find(n => n.content.data?.todoId === todo.id);
      console.log('IMMEDIATE VERIFICATION:', {
        found: !!thisNotif,
        scheduledTrigger: thisNotif?.trigger,
        expectedTimestamp: notificationTime.getTime(),
        expectedDate: new Date(notificationTime).toLocaleString()
      });

      // 1. Verify immediate scheduling success
      const verifiedNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const thisNotification = verifiedNotifications.find(n => n.content.data?.todoId === todo.id);
      
      if (!thisNotification) {
        throw new Error('Notification was not scheduled successfully');
      }

      // 2. Calculate actual scheduled time based on timeInterval
      const actualScheduledTime = new Date(Date.now() + ((thisNotification.trigger as any).seconds * 1000));
      
      // 3. Verify all scheduled notifications
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      console.log('\n📋 SCHEDULED NOTIFICATIONS:');
      scheduledNotifications.forEach(notification => {
        console.log(`- Title: ${notification.content.title}`);
        console.log('Raw trigger:', notification.trigger);
        const triggerDate = (notification.trigger as any).date;
        console.log('Trigger date value:', triggerDate);
        console.log(`  Scheduled for: ${triggerDate ? new Date(triggerDate).toLocaleString() : 'Invalid date'}`);
      });

      // 4. Get iOS notification settings to verify permissions
      const settings = await Notifications.getPermissionsAsync();
      if (!settings.granted) {
        throw new Error('Notification permissions not granted');
      }

      // Verify the notification was scheduled
      let verifiedScheduledTime: Date | undefined;
      if (thisNotification.trigger) {
        if ((thisNotification.trigger as any).type === 'date') {
          verifiedScheduledTime = new Date((thisNotification.trigger as any).date);
        } else if ((thisNotification.trigger as any).type === 'timeInterval') {
          verifiedScheduledTime = new Date(Date.now() + ((thisNotification.trigger as any).seconds * 1000));
        }
      }

      if (!verifiedScheduledTime || isNaN(verifiedScheduledTime.getTime())) {
        console.log('⚠️ ERROR: Invalid scheduled date');
        console.log('Notification trigger:', JSON.stringify(thisNotification.trigger, null, 2));
      }

      // 5. Final verification summary
      console.log('\n🚨 FINAL NOTIFICATION DETAILS 🚨');
      console.log('--------------------------------');
      console.log(`📅 SCHEDULED TIME: ${format(notificationTime, 'PPP HH:mm:ss')}`);
      console.log(`📝 TITLE: ${todo.title}`);
      console.log(`💬 BODY: ${reminder}`);
      console.log(`✅ FOUND IN SYSTEM: YES`);
      console.log(`📱 PERMISSIONS OK: ${settings.granted}`);
      console.log(`⏰ SECONDS UNTIL NOTIFICATION: ${Math.round((notificationTime.getTime() - Date.now()) / 1000)}`);
      console.log('--------------------------------\n');

      // Also log to LoggingService
      LoggingService.info('Smart notification scheduled', {
        todoId: todo.id,
        taskTitle: todo.title,
        originalDueDate: format(todo.dueDate, 'PPP HH:mm'),
        notificationTime: format(notificationTime, 'PPP HH:mm'),
        llmAnalysis: timing
      });

    } catch (error) {
      console.log('❌ ERROR scheduling notification:', error); // Debug log
      LoggingService.error('Failed to schedule smart notification', { 
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