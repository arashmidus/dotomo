import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Share } from 'react-native';
import { LoggingService } from '../services/LoggingService';
import { useErrorHandler } from '../hooks/useErrorHandler';

export function DebugScreen() {
  const { error, handleError, clearError } = useErrorHandler('DebugScreen');
  const [logs, setLogs] = useState<string>('');

  async function handleExportLogs() {
    try {
      const exportedLogs = await LoggingService.exportLogs();
      await Share.share({
        message: exportedLogs,
        title: 'Application Logs',
      });
    } catch (error) {
      if (error instanceof Error) {
        handleError(error);
      }
    }
  }

  return (
    <ScrollView style={styles.container}>
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error.message}</Text>
          <Pressable onPress={clearError}>
            <Text style={styles.errorButton}>Dismiss</Text>
          </Pressable>
        </View>
      )}

      <Pressable style={styles.button} onPress={handleExportLogs}>
        <Text style={styles.buttonText}>Export Logs</Text>
      </Pressable>

      {logs ? (
        <Text style={styles.logs}>{logs}</Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#c62828',
    marginBottom: 8,
  },
  errorButton: {
    color: '#007AFF',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logs: {
    marginTop: 16,
    fontFamily: 'monospace',
    fontSize: 12,
  },
}); 