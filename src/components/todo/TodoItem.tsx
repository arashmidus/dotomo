import { Pressable, Text, StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Todo } from '../../types';
import Animated, { 
  useAnimatedStyle, 
  withTiming,
  interpolateColor
} from 'react-native-reanimated';
import { useEffect, useState } from 'react';
import { differenceInHours, differenceInMinutes, isAfter, addHours } from 'date-fns';

interface TodoItemProps {
  todo: Todo & { createdAt: Date };
  onToggle: (id: string) => void;
  onPress: (todo: Todo) => void;
  onExpire?: (id: string) => void;
}

export function TodoItem({ todo, onToggle, onPress, onExpire }: TodoItemProps) {
  const [timeRemaining, setTimeRemaining] = useState('');

  useEffect(() => {
    console.log('Todo created at:', todo.createdAt);
    const createdAtDate = new Date(todo.createdAt);
    const expiryTime = addHours(createdAtDate, 18);

    const updateTimer = () => {
      const now = new Date();
      if (isAfter(now, expiryTime)) {
        onExpire?.(todo.id);
        return;
      }

      const hoursLeft = Math.max(0, differenceInHours(expiryTime, now));
      const minutesLeft = Math.max(0, differenceInMinutes(expiryTime, now) % 60);
      setTimeRemaining(`${hoursLeft}h ${minutesLeft}m remaining`);
    };

    // Initial update
    updateTimer();

    // Update every minute
    const timer = setInterval(updateTimer, 60000);

    return () => clearInterval(timer);
  }, [todo.createdAt, todo.id, onExpire]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: withTiming(
        todo.completed ? 'rgba(0, 122, 255, 0.1)' : 'white'
      ),
    };
  });

  const textStyle = useAnimatedStyle(() => {
    return {
      color: withTiming(
        todo.completed ? '#666' : '#000'
      ),
      textDecorationLine: todo.completed ? 'line-through' : 'none',
    };
  });

  const isOverdue = !todo.completed && new Date() > todo.dueDate;

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <Pressable
        style={styles.checkbox}
        onPress={() => onToggle(todo.id)}
        hitSlop={8}
      >
        <MaterialIcons
          name={todo.completed ? 'check-box' : 'check-box-outline-blank'}
          size={24}
          color={todo.completed ? '#007AFF' : '#666'}
        />
      </Pressable>

      <Pressable
        style={styles.content}
        onPress={() => onPress(todo)}
      >
        <Animated.Text
          style={[styles.title, textStyle]}
          numberOfLines={1}
        >
          {todo.title}
        </Animated.Text>
        
        <Text style={styles.timer}>{timeRemaining}</Text>

        <View style={styles.details}>
          {todo.description ? (
            <Text style={styles.description} numberOfLines={1}>
              {todo.description}
            </Text>
          ) : null}
          
          <Text
            style={[
              styles.date,
              isOverdue && styles.overdue
            ]}
          >
            {format(todo.dueDate, 'MMM d, yyyy')}
          </Text>
        </View>
      </Pressable>

      <MaterialIcons
        name="chevron-right"
        size={24}
        color="#666"
        style={styles.chevron}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  checkbox: {
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  details: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  description: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    marginRight: 8,
  },
  date: {
    fontSize: 12,
    color: '#666',
  },
  overdue: {
    color: '#ff3b30',
  },
  chevron: {
    marginLeft: 8,
  },
  timer: {
    fontSize: 12,
    color: '#FF5722',
    marginBottom: 4,
  },
}); 