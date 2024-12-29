import { Stack } from 'expo-router';
import { Platform } from 'react-native';

export default function Layout() {
  return (
    <Stack
      screenOptions={{
        // Make modals slide up from bottom on iOS
        presentation: Platform.OS === 'ios' ? 'modal' : 'card',
        // Remove header for modals
        headerShown: false,
        // Configure modal presentation style
        contentStyle: {
          backgroundColor: 'transparent',
        },
        // Handle the safe area differently for modals
        safeAreaInsets: { 
          bottom: 0 
        },
      }}
    />
  );
} 