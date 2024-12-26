import { View, StyleSheet, Text, Animated, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { SmartTodoInput } from '../components/todo/SmartTodoInput';
import { useTodos } from '../contexts/TodoContext';
import { useSettings } from '../contexts/SettingsContext';
import { NotificationService } from '../services/NotificationService';
import { ParsedTodo } from '../types/nlp';

export function AddTodoScreen() {
  const navigation = useNavigation();
  const { addTodo } = useTodos();
  const { settings } = useSettings();

  async function handleSubmit(parsedTodo: ParsedTodo) {
    const todo = {
      title: parsedTodo.title,
      description: parsedTodo.description,
      dueDate: parsedTodo.dueDate || new Date(),
      completed: false,
      tags: parsedTodo.tags,
      priority: parsedTodo.priority || 'medium',
    };

    await addTodo(todo);
    
    if (settings.notifications.enabled) {
      await NotificationService.sendImmediateNotification(todo, settings.notifications);
    }

    navigation.goBack();
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => navigation.goBack()}
      >
        <MaterialIcons name="close" size={24} color="#666" />
      </TouchableOpacity>

      <View style={styles.header}>
        <MaterialIcons name="playlist-add" size={48} color="#007AFF" />
        <Text style={styles.title}>Create New Task</Text>
        <Text style={styles.subtitle}>What would you like to accomplish?</Text>
      </View>

      <Animated.View style={styles.card}>
        <View style={styles.cardHeader}>
          <MaterialIcons name="edit" size={24} color="#007AFF" />
          <Text style={styles.cardTitle}>New Task</Text>
        </View>
        <View style={styles.inputContainer}>
          <SmartTodoInput onSubmit={handleSubmit} />
        </View>
      </Animated.View>

      <View style={styles.decorationContainer}>
        <MaterialIcons name="stars" size={24} color="#007AFF" style={styles.decoration} />
        <MaterialIcons name="local-fire-department" size={24} color="#FF9500" style={styles.decoration} />
        <MaterialIcons name="emoji-events" size={24} color="#34C759" style={styles.decoration} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    padding: 20,
    marginTop: 60,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 12,
    color: '#007AFF',
  },
  inputContainer: {
    marginBottom: 16,
  },
  decorationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 30,
  },
  decoration: {
    margin: 8,
    transform: [{ rotate: '-15deg' }],
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 1,
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
}); 