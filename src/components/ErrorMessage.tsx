import { Text, StyleSheet, Pressable } from 'react-native';

interface ErrorMessageProps {
  message: string;
  onDismiss: () => void;
}

export function ErrorMessage({ message, onDismiss }: ErrorMessageProps) {
  return (
    <Pressable style={styles.container} onPress={onDismiss}>
      <Text style={styles.text}>{message}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ff3b30',
    padding: 16,
    margin: 16,
    borderRadius: 8,
  },
  text: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
}); 