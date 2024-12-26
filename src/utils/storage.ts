import AsyncStorage from '@react-native-async-storage/async-storage';
import { Todo } from '../types';

const TODOS_KEY = 'todos';

export async function saveTodos(todos: Todo[]): Promise<void> {
  try {
    await AsyncStorage.setItem(TODOS_KEY, JSON.stringify(todos));
  } catch (error) {
    console.error('Error saving todos:', error);
  }
}

export async function loadTodos(): Promise<Todo[]> {
  try {
    const todosJson = await AsyncStorage.getItem(TODOS_KEY);
    if (todosJson) {
      const todos = JSON.parse(todosJson);
      // Convert string dates back to Date objects
      return todos.map((todo: Todo) => ({
        ...todo,
        createdAt: new Date(todo.createdAt),
        dueDate: new Date(todo.dueDate),
      }));
    }
    return [];
  } catch (error) {
    console.error('Error loading todos:', error);
    return [];
  }
} 