import { View } from 'react-native';
import { TodoList } from '../components/todo/TodoList';
import { DarkModeShader } from '../components/shaders/DarkModeShader';

export function HomeScreen() {
  return (
    <View style={{ flex: 1 }}>
      <DarkModeShader />
      <TodoList />
    </View>
  );
} 