import { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';

export function AuthScreen() {
  const { authenticate, hasHardware } = useAuth();

  useEffect(() => {
    checkBiometrics();
  }, []);

  async function checkBiometrics() {
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const hasFaceId = supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
    
    if (hasFaceId) {
      authenticate();
    }
  }

  return (
    <View style={styles.container}>
      <MaterialIcons name="face-unlock" size={64} color="#007AFF" />
      <Text style={styles.title}>Secure Todo</Text>
      <Text style={styles.subtitle}>
        {hasHardware
          ? 'Please use Face ID to access your todos'
          : 'Face ID is not available on this device'}
      </Text>
      {hasHardware && (
        <Pressable style={styles.button} onPress={authenticate}>
          <Text style={styles.buttonText}>Use Face ID</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 