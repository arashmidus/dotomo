import React from 'react';
import { View, TouchableOpacity, SafeAreaView, AppState, Platform, Linking, IntentLauncher } from 'react-native';
import { TodoList } from '../components/todo/TodoList';
import { DarkModeShader } from '../components/shaders/DarkModeShader';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';

type RootStackParamList = {
  Home: undefined;
  SettingsScreen: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [notificationsAllowed, setNotificationsAllowed] = React.useState(true);

  React.useEffect(() => {
    checkNotificationPermissions();

    // Add subscription to permission changes
    const subscription = Notifications.addNotificationResponseReceivedListener(() => {
      checkNotificationPermissions();
    });

    // Check permissions when app comes to foreground
    const foregroundSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkNotificationPermissions();
      }
    });

    return () => {
      subscription.remove();
      foregroundSubscription.remove();
    };
  }, []);

  const checkNotificationPermissions = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setNotificationsAllowed(status === 'granted');
  };

  const requestNotificationPermission = async () => {
    console.log('Requesting notification permission...');
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      
      if (existingStatus === 'denied') {
        // On iOS, we can use Linking to take users to app settings
        if (Platform.OS === 'ios') {
          Linking.openSettings();
        } else {
          // For Android, we can use IntentLauncher
          await IntentLauncher.startActivityAsync(
            IntentLauncher.ActivityAction.NOTIFICATION_SETTINGS
          );
        }
        return;
      }

      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
        android: true
      });
      console.log('Permission status:', status);
      setNotificationsAllowed(status === 'granted');
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  };

  React.useEffect(() => {
    console.log('Current notification status:', notificationsAllowed);
    navigation.setOptions({
      headerLeft: () => (
        notificationsAllowed ? null : (
          <TouchableOpacity 
            style={{ paddingLeft: 24 }}
            onPress={() => {
              console.log('TouchableOpacity pressed');
              requestNotificationPermission();
            }}
          >
            <Ionicons name="notifications-off-outline" size={24} color="white" />
          </TouchableOpacity>
        )
      ),
      headerRight: () => (
        <TouchableOpacity 
          style={{ paddingRight: 24 }}
          onPress={() => navigation.navigate('SettingsScreen')}
        >
          <Ionicons name="settings-outline" size={24} color="white" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, notificationsAllowed, requestNotificationPermission]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
      <DarkModeShader />
      <TodoList />
    </SafeAreaView>
  );
} 