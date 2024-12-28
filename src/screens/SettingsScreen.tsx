import { View, Text, StyleSheet, Switch, ScrollView, ActivityIndicator, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { Picker } from '@react-native-picker/picker';
import { DarkModeShader } from '../components/shaders/DarkModeShader';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as LocalAuthentication from 'expo-local-authentication';

type RootStackParamList = {
  Home: undefined;
  SettingsScreen: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'SettingsScreen'>;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginVertical: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 16,
    marginBottom: 8,
    marginTop: 16,
    color: 'rgba(255, 255, 255, 0.95)',
  },
  setting: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  settingLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  picker: {
    width: 150,
    color: '#fff',
  },
  backButton: {
    padding: 8,
  },
  backButtonContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  savingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  savingText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 16,
  },
  scrollContent: {
    paddingTop: 60,
  },
  infoText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  timeInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    width: 120,
    textAlign: 'center',
  },
  badge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  titleContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  titleText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
});

export function SettingsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { settings, updateSettings, isLoading } = useSettings();
  const [isSaving, setIsSaving] = useState(false);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('');

  const dynamicStyles = {
    sectionTitle: {
      color: 'rgba(255, 255, 255, 0.95)',
    },
    settingLabel: {
      color: 'rgba(255, 255, 255, 0.9)',
    },
  };

  async function handleSettingChange<K extends keyof typeof settings>(
    key: K,
    value: typeof settings[K]
  ) {
    try {
      setIsSaving(true);
      await updateSettings({ [key]: value });
    } finally {
      setIsSaving(false);
    }
  }

  const handleBack = () => {
    requestAnimationFrame(() => {
      navigation.goBack();
    });
  };

  useEffect(() => {
    (async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      setIsBiometricSupported(compatible);

      if (compatible) {
        const type = await LocalAuthentication.supportedAuthenticationTypesAsync();
        // Type 2 is FaceID
        setBiometricType(type.includes(2) ? 'Face ID' : 'Touch ID');
      }
    })();
  }, []);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#000' }]}>
        <DarkModeShader opacity={0.85} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#000' }]}>
      <DarkModeShader opacity={0.85} />
      
      <View style={styles.backButtonContainer}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.titleText}>Settings</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        {/* <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.setting}>
            <Text style={styles.settingLabel}>Enable Notifications</Text>
            <Switch
              value={settings.notifications.enabled}
              onValueChange={(value) =>
                handleSettingChange('notifications', {
                  ...settings.notifications,
                  enabled: value,
                })
              }
            />
          </View>

          {settings.notifications.enabled && (
            <>
              <View style={styles.setting}>
                <Text style={styles.settingLabel}>Reminder Timing (hours)</Text>
                <Picker
                  selectedValue={settings.notifications.reminderTiming}
                  style={styles.picker}
                  onValueChange={(value) =>
                    handleSettingChange('notifications', {
                      ...settings.notifications,
                      reminderTiming: value,
                    })
                  }
                >
                  <Picker.Item label="30 minutes" value={0.5} />
                  <Picker.Item label="1 hour" value={1} />
                  <Picker.Item label="2 hours" value={2} />
                  <Picker.Item label="4 hours" value={4} />
                  <Picker.Item label="1 day" value={24} />
                </Picker>
              </View>

              <View style={styles.setting}>
                <Text style={styles.settingLabel}>Sound</Text>
                <Switch
                  value={settings.notifications.sound}
                  onValueChange={(value) =>
                    handleSettingChange('notifications', {
                      ...settings.notifications,
                      sound: value,
                    })
                  }
                />
              </View>

              <View style={styles.setting}>
                <Text style={styles.settingLabel}>Vibration</Text>
                <Switch
                  value={settings.notifications.vibration}
                  onValueChange={(value) =>
                    handleSettingChange('notifications', {
                      ...settings.notifications,
                      vibration: value,
                    })
                  }
                />
              </View>
            </>
          )}
        </View> */}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personalization</Text>
          <Text style={styles.infoText}>
            Help us understand your daily routine to provide better-timed notifications
          </Text>

          <View style={styles.setting}>
            <Text style={styles.settingLabel}>Wake-up Time</Text>
            <View style={styles.timeInput}>
              <Text style={styles.settingLabel}>07:00</Text>
            </View>
          </View>

          <View style={styles.setting}>
            <Text style={styles.settingLabel}>Bedtime</Text>
            <View style={styles.timeInput}>
              <Text style={styles.settingLabel}>22:00</Text>
            </View>
          </View>

          <View style={styles.setting}>
            <Text style={styles.settingLabel}>Work Hours</Text>
            <View style={[styles.setting, { paddingHorizontal: 0 }]}>
              <View style={styles.timeInput}>
                <Text style={styles.settingLabel}>09:00</Text>
              </View>
              <Text style={[styles.settingLabel, { marginHorizontal: 8 }]}>to</Text>
              <View style={styles.timeInput}>
                <Text style={styles.settingLabel}>17:00</Text>
              </View>
            </View>
          </View>

          <View style={styles.setting}>
            <Text style={styles.settingLabel}>Preferred Notification Times</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Coming Soon</Text>
            </View>
          </View>
        </View>

        {/* <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <View style={styles.setting}>
            <Text style={styles.settingLabel}>Theme</Text>
            <Picker
              selectedValue={settings.theme}
              style={styles.picker}
              onValueChange={(value) => handleSettingChange('theme', value)}
            >
              <Picker.Item label="System" value="system" />
              <Picker.Item label="Light" value="light" />
              <Picker.Item label="Dark" value="dark" />
            </Picker>
          </View>
        </View> */}

        {/* <View style={styles.section}>
          <Text style={styles.sectionTitle}>Defaults</Text>
          <View style={styles.setting}>
            <Text style={styles.settingLabel}>Default Priority</Text>
            <Picker
              selectedValue={settings.defaultPriority}
              style={styles.picker}
              onValueChange={(value) => handleSettingChange('defaultPriority', value)}
            >
              <Picker.Item label="Low" value="low" />
              <Picker.Item label="Medium" value="medium" />
              <Picker.Item label="High" value="high" />
            </Picker>
          </View>
        </View> */}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          
          {isBiometricSupported ? (
            <>
              <View style={styles.setting}>
                <View>
                  <Text style={styles.settingLabel}>Enable {biometricType}</Text>
                  <Text style={styles.infoText}>
                    Use {biometricType} to quickly access the app
                  </Text>
                </View>
                <Switch
                  value={settings.biometricEnabled}
                  onValueChange={async (value) => {
                    if (value) {
                      try {
                        // First check if biometrics are available
                        const available = await LocalAuthentication.isEnrolledAsync();
                        if (!available) {
                          Alert.alert(
                            'Biometric Not Set Up',
                            `Please set up ${biometricType} in your device settings first.`
                          );
                          return;
                        }

                        // Try to authenticate
                        const result = await LocalAuthentication.authenticateAsync({
                          promptMessage: `Enable ${biometricType}`,
                          disableDeviceFallback: true,
                          fallbackLabel: 'Use passcode'
                        });

                        console.log('Authentication result:', result); // For debugging

                        if (result.success) {
                          await handleSettingChange('biometricEnabled', value);
                        } else {
                          // Authentication failed
                          Alert.alert(
                            'Authentication Failed',
                            'Please try again.'
                          );
                        }
                      } catch (error) {
                        console.error('Biometric error:', error);
                        Alert.alert(
                          'Error',
                          'There was an error setting up biometric authentication.'
                        );
                      }
                    } else {
                      await handleSettingChange('biometricEnabled', false);
                    }
                  }}
                />
              </View>

              {settings.biometricEnabled && (
                <View style={styles.setting}>
                  <Text style={styles.settingLabel}>Require After</Text>
                  <Picker
                    selectedValue={settings.biometricTimeout}
                    style={styles.picker}
                    onValueChange={(value) => 
                      handleSettingChange('biometricTimeout', value)
                    }
                  >
                    <Picker.Item label="Immediately" value={0} />
                    <Picker.Item label="1 minute" value={1} />
                    <Picker.Item label="5 minutes" value={5} />
                    <Picker.Item label="1 hour" value={60} />
                    <Picker.Item label="4 hours" value={240} />
                  </Picker>
                </View>
              )}
            </>
          ) : (
            <View style={styles.setting}>
              <Text style={[styles.settingLabel, { opacity: 0.7 }]}>
                Biometric authentication not available on this device
              </Text>
            </View>
          )}

          <View style={styles.setting}>
            <Text style={styles.settingLabel}>App Lock</Text>
            <Switch
              value={settings.appLockEnabled}
              onValueChange={(value) => handleSettingChange('appLockEnabled', value)}
            />
          </View>
        </View>
      </ScrollView>

      {isSaving && (
        <View style={styles.savingOverlay}>
          <ActivityIndicator color="#fff" />
          <Text style={styles.savingText}>Saving...</Text>
        </View>
      )}
    </SafeAreaView>
  );
} 