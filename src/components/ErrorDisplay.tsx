import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ErrorDisplayProps {
  error: Error;
}

export function ErrorDisplay({ error }: ErrorDisplayProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.errorText}>Error: {error.message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
  },
}); 