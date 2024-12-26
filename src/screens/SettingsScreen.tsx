import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useSettings } from '../contexts/SettingsContext';
import { Picker } from '@react-native-picker/picker';

export function SettingsScreen() {
  const { settings, updateSettings, isLoading } = useSettings();
  const [isSaving, setIsSaving] = useState(false);

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

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
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
      </View>

      <View style={styles.section}>
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
      </View>

      <View style={styles.section}>
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
      </View>

      {isSaving && (
        <View style={styles.savingOverlay}>
          <ActivityIndicator color="#fff" />
          <Text style={styles.savingText}>Saving...</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    backgroundColor: '#fff',
    marginVertical: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginLeft: 16,
    marginBottom: 8,
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
    color: '#000',
  },
  picker: {
    width: 150,
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
}); 