import { View, Text, StyleSheet, Switch, ScrollView, ActivityIndicator, SafeAreaView, TouchableOpacity, Alert, Platform, Linking } from 'react-native';
import { useState, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { Picker } from '@react-native-picker/picker';
import { DarkModeShader } from '../components/shaders/DarkModeShader';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type RootStackParamList = {
  Home: undefined;
  SettingsScreen: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'SettingsScreen'>;

type TimeSettings = {
  wakeUpTime: string;
  bedTime: string;
  workStartTime: string;
  workEndTime: string;
};

type TimePickerState = {
  show: boolean;
  mode: 'date' | 'time';
  current: keyof TimeSettings | null;
};

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
    marginHorizontal: 16,
    marginVertical: 12,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 16,
    marginBottom: 8,
    color: 'rgba(255, 255, 255, 0.95)',
  },
  setting: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
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
    top: Platform.OS === 'ios' ? 60 : 20,
    left: 16,
    right: 16,
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
    paddingTop: Platform.OS === 'ios' ? 120 : 80,
    paddingBottom: 32,
  },
  infoText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    paddingHorizontal: 16,
    paddingBottom: 16,
    lineHeight: 20,
  },
  timeInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 12,
    padding: 12,
    minWidth: 100,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  timeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  timeSeparator: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    marginHorizontal: 12,
    fontWeight: '500',
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
  supportSection: {
    marginHorizontal: 16,
    marginVertical: 12,
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
  },
  heartIcon: {
    marginBottom: 16,
  },
  supportTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  supportText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  donateButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
  },
  donateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export function SettingsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { settings, updateSettings, isLoading } = useSettings();
  const [isSaving, setIsSaving] = useState(false);
  const [timeSettings, setTimeSettings] = useState<TimeSettings>({
    wakeUpTime: settings.wakeUpTime || '07:00',
    bedTime: settings.bedTime || '22:00',
    workStartTime: settings.workStartTime || '09:00',
    workEndTime: settings.workEndTime || '17:00',
  });
  const [timePicker, setTimePicker] = useState<TimePickerState>({
    show: false,
    mode: 'time',
    current: null
  });

  const dynamicStyles = {
    sectionTitle: {
      color: 'rgba(255, 255, 255, 0.95)',
    },
    settingLabel: {
      color: 'rgba(255, 255, 255, 0.9)',
    },
  };

  const handleSettingChange = async (key: keyof AppSettings, value: any) => {
    try {
      console.log('[Settings] Updating setting:', key, 'to:', value);
      setIsSaving(true);
      await updateSettings({ [key]: value });
      console.log('[Settings] Successfully updated:', key);
    } catch (error) {
      console.error('[Settings] Error updating setting:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    requestAnimationFrame(() => {
      navigation.goBack();
    });
  };

  const handleTimeChange = async (key: keyof TimeSettings, value: string) => {
    try {
      // Validate work start time is after wake-up time
      if (key === 'workStartTime') {
        const [wakeHours, wakeMinutes] = timeSettings.wakeUpTime.split(':');
        const [startHours, startMinutes] = value.split(':');
        
        const wakeTime = parseInt(wakeHours) * 60 + parseInt(wakeMinutes);
        const startTime = parseInt(startHours) * 60 + parseInt(startMinutes);

        if (startTime <= wakeTime) {
          throw new Error('Work start time must be at least one minute after wake-up time');
        }
      }

      // Validate times before saving
      if (key === 'wakeUpTime' || key === 'bedTime') {
        const [bedHours, bedMinutes] = (key === 'bedTime' ? value : timeSettings.bedTime).split(':');
        const [wakeHours, wakeMinutes] = (key === 'wakeUpTime' ? value : timeSettings.wakeUpTime).split(':');
        
        const bedTime = parseInt(bedHours) * 60 + parseInt(bedMinutes);
        const wakeTime = parseInt(wakeHours) * 60 + parseInt(wakeMinutes);
        
        // Normalize times for comparison
        const normalizedWakeTime = wakeTime;
        const normalizedBedTime = bedTime < wakeTime ? bedTime + (24 * 60) : bedTime;
        
        // Calculate duration in hours
        const durationInHours = (normalizedWakeTime - (normalizedBedTime - 24 * 60)) / 60;

        if (durationInHours > 16) {
          throw new Error('Sleep duration cannot be more than 16 hours');
        }

        // For wake-up time, validate against work start time
        if (key === 'wakeUpTime') {
          const [startHours, startMinutes] = timeSettings.workStartTime.split(':');
          const startTime = parseInt(startHours) * 60 + parseInt(startMinutes);
          
          if (wakeTime >= startTime) {
            throw new Error('Wake-up time must be at least one minute before work start time');
          }
        }

        if ((key === 'wakeUpTime' && normalizedWakeTime >= normalizedBedTime) ||
            (key === 'bedTime' && normalizedBedTime <= normalizedWakeTime)) {
          throw new Error('Invalid time combination');
        }
      }

      setTimeSettings(prev => ({ ...prev, [key]: value }));
      await handleSettingChange(key, value);
    } catch (error) {
      console.error('[Settings] Error updating time setting:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update time setting');
    }
  };

  const showTimePicker = (setting: keyof TimeSettings) => {
    setTimePicker({
      show: true,
      mode: 'time',
      current: setting
    });
  };

  const onTimeChange = (event: any, selectedDate?: Date) => {
    setTimePicker(prev => ({ ...prev, show: false }));

    if (event.type === 'dismissed' || !selectedDate || !timePicker.current) {
      return;
    }

    const timeString = format(selectedDate, 'HH:mm');
    handleTimeChange(timePicker.current, timeString);
  };

  const handleTimePickerConfirm = (selectedDate: Date) => {
    if (!timePicker.current) return;
    
    const timeString = format(selectedDate, 'HH:mm');

    // Work hours validation
    if (timePicker.current === 'workEndTime') {
      const [startHours, startMinutes] = timeSettings.workStartTime.split(':');
      const startTime = parseInt(startHours) * 60 + parseInt(startMinutes);
      const [endHours, endMinutes] = timeString.split(':');
      const endTime = parseInt(endHours) * 60 + parseInt(endMinutes);

      if (endTime <= startTime) {
        Alert.alert(
          'Invalid Time',
          'Work end time must be after work start time',
          [{ text: 'OK' }]
        );
        return;
      }
    }

    // Validate work start time is after wake-up time
    if (timePicker.current === 'workStartTime') {
      const [wakeHours, wakeMinutes] = timeSettings.wakeUpTime.split(':');
      const [startHours, startMinutes] = timeString.split(':');
      
      const wakeTime = parseInt(wakeHours) * 60 + parseInt(wakeMinutes);
      const startTime = parseInt(startHours) * 60 + parseInt(startMinutes);

      if (startTime <= wakeTime) {
        Alert.alert(
          'Invalid Time',
          'Work start time must be at least one minute after wake-up time',
          [{ text: 'OK' }]
        );
        return;
      }
    }

    // Sleep schedule validation
    if (timePicker.current === 'wakeUpTime' || timePicker.current === 'bedTime') {
      const [bedHours, bedMinutes] = (timePicker.current === 'bedTime' ? timeString : timeSettings.bedTime).split(':');
      const [wakeHours, wakeMinutes] = (timePicker.current === 'wakeUpTime' ? timeString : timeSettings.wakeUpTime).split(':');
      
      const bedTime = parseInt(bedHours) * 60 + parseInt(bedMinutes);
      const wakeTime = parseInt(wakeHours) * 60 + parseInt(wakeMinutes);
      
      // Convert times to a 24-hour cycle where we assume:
      // - Bedtime is in the evening (PM)
      // - Wake time is in the morning (AM)
      const normalizedWakeTime = wakeTime;
      const normalizedBedTime = bedTime < wakeTime ? bedTime + (24 * 60) : bedTime;
      
      // Calculate duration in hours
      const durationInHours = (normalizedWakeTime - (normalizedBedTime - 24 * 60)) / 60;

      if (durationInHours > 16) {
        Alert.alert(
          'Invalid Sleep Duration',
          'Sleep duration cannot be more than 16 hours',
          [{ text: 'OK' }]
        );
        return;
      }

      // For wake-up time, also validate against work start time
      if (timePicker.current === 'wakeUpTime') {
        const [startHours, startMinutes] = timeSettings.workStartTime.split(':');
        const startTime = parseInt(startHours) * 60 + parseInt(startMinutes);
        
        if (wakeTime >= startTime) {
          Alert.alert(
            'Invalid Time',
            'Wake-up time must be at least one minute before work start time',
            [{ text: 'OK' }]
          );
          return;
        }
      }

      if (timePicker.current === 'wakeUpTime' && normalizedWakeTime >= normalizedBedTime) {
        Alert.alert(
          'Invalid Time',
          'Wake-up time must be after bedtime',
          [{ text: 'OK' }]
        );
        return;
      }
      
      if (timePicker.current === 'bedTime' && normalizedBedTime <= normalizedWakeTime) {
        Alert.alert(
          'Invalid Time',
          'Bedtime must be before wake-up time',
          [{ text: 'OK' }]
        );
        return;
      }
    }

    handleTimeChange(timePicker.current, timeString);
    setTimePicker(prev => ({ ...prev, show: false }));
  };

  const insets = useSafeAreaInsets();

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
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personalization</Text>
          <Text style={styles.infoText}>
            Help us understand your daily routine to provide better-timed notifications
          </Text>

          <View style={styles.setting}>
            <Text style={styles.settingLabel}>Sleep Schedule</Text>
            <View style={[styles.setting, { paddingHorizontal: 0 }]}>
              <TouchableOpacity 
                style={styles.timeInput}
                onPress={() => showTimePicker('bedTime')}
              >
                <Text style={styles.timeText}>{timeSettings.bedTime}</Text>
              </TouchableOpacity>
              <Text style={styles.timeSeparator}>to</Text>
              <TouchableOpacity 
                style={styles.timeInput}
                onPress={() => showTimePicker('wakeUpTime')}
              >
                <Text style={styles.timeText}>{timeSettings.wakeUpTime}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.setting}>
            <Text style={styles.settingLabel}>Work Hours</Text>
            <View style={[styles.setting, { paddingHorizontal: 0 }]}>
              <TouchableOpacity 
                style={styles.timeInput}
                onPress={() => showTimePicker('workStartTime')}
              >
                <Text style={styles.timeText}>{timeSettings.workStartTime}</Text>
              </TouchableOpacity>
              <Text style={styles.timeSeparator}>to</Text>
              <TouchableOpacity 
                style={styles.timeInput}
                onPress={() => showTimePicker('workEndTime')}
              >
                <Text style={styles.timeText}>{timeSettings.workEndTime}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* <View style={styles.setting}>
            <Text style={styles.settingLabel}>Preferred Notification Times</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Coming Soon</Text>
            </View>
          </View> */}
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

        <View style={styles.supportSection}>
          <MaterialIcons 
            name="favorite" 
            size={32} 
            color="#FF3B30" 
            style={styles.heartIcon}
          />
          <Text style={styles.supportTitle}>Made with Love</Text>
          <Text style={styles.supportText}>
            This app is completely free and we collect absolutely no data from our users. 
            We believe in creating tools that respect your privacy while helping you stay productive.
          </Text>
          <TouchableOpacity 
            style={styles.donateButton}
            onPress={() => Linking.openURL('https://ko-fi.com/dotomo')}
            activeOpacity={0.8}
          >
            <MaterialIcons name="favorite-border" size={20} color="#fff" />
            <Text style={styles.donateButtonText}>Support the App</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {isSaving && (
        <View style={styles.savingOverlay}>
          <ActivityIndicator color="#fff" />
          <Text style={styles.savingText}>Saving...</Text>
        </View>
      )}

      {timePicker.show && (
        <View style={{
          position: 'absolute',
          top: 540,
          left: 0,
          right: 0,
          bottom: -insets.bottom,
          zIndex: 1000,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <TouchableOpacity 
            style={{
              position: 'absolute',
              top: 24,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.0)',
            }}
            onPress={() => setTimePicker(prev => ({ ...prev, show: false }))}
            activeOpacity={1}
          />

          <View style={{
            width: '90%',
            backgroundColor: '#1C1C1E',
            borderRadius: 16,
            overflow: 'hidden',
            shadowColor: "#000",
            shadowOffset: {
              width: 0,
              height: 2,
            },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: 'rgba(255,255,255,0.1)',
            }}>
              <TouchableOpacity
                onPress={() => setTimePicker(prev => ({ ...prev, show: false }))}
                style={{ minWidth: 60 }}
              >
                <Text style={{
                  color: '#007AFF',
                  fontSize: 17,
                }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              
              <Text style={{
                color: '#FFFFFF',
                fontSize: 17,
                fontWeight: '600',
              }}>
                {(() => {
                  switch(timePicker.current) {
                    case 'wakeUpTime': return 'Wake-up Time';
                    case 'bedTime': return 'Bedtime';
                    case 'workStartTime': return 'Work Start';
                    case 'workEndTime': return 'Work End';
                    default: return 'Select Time';
                  }
                })()}
              </Text>
              
              <TouchableOpacity
                onPress={() => {
                  const [hours, minutes] = timeSettings[timePicker.current!].split(':');
                  const date = new Date();
                  date.setHours(parseInt(hours, 10));
                  date.setMinutes(parseInt(minutes, 10));
                  handleTimePickerConfirm(date);
                }}
                style={{ minWidth: 60, alignItems: 'flex-end' }}
              >
                <Text style={{
                  color: '#007AFF',
                  fontSize: 17,
                  fontWeight: '600',
                }}>
                  Done
                </Text>
              </TouchableOpacity>
            </View>

            <DateTimePicker
              value={(() => {
                const [hours, minutes] = (timeSettings[timePicker.current!] || '00:00').split(':');
                const date = new Date();
                date.setHours(parseInt(hours, 10));
                date.setMinutes(parseInt(minutes, 10));
                return date;
              })()}
              minimumDate={(() => {
                if (timePicker.current === 'workEndTime') {
                  const [hours, minutes] = timeSettings.workStartTime.split(':');
                  const date = new Date();
                  date.setHours(parseInt(hours, 10));
                  date.setMinutes(parseInt(minutes, 10));
                  return date;
                }
                return undefined;
              })()}
              mode={timePicker.mode}
              is24Hour={true}
              display="spinner"
              onChange={(event, date) => {
                if (date && event.type !== 'dismissed') {
                  const timeString = format(date, 'HH:mm');
                  setTimeSettings(prev => ({
                    ...prev,
                    [timePicker.current!]: timeString
                  }));
                }
              }}
              textColor="#FFFFFF"
              themeVariant="dark"
              style={{
                height: 200,
                backgroundColor: '#1C1C1E',
              }}
            />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
} 