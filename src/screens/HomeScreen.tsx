import { View } from 'react-native';
import { TodoList } from '../components/todo/TodoList';

export function HomeScreen() {
  return (
    <View style={{ flex: 1 }}>
      <TodoList />
    </View>
  );
} 