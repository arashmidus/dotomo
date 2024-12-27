import React from 'react';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { createContext, useContext, useReducer, useEffect, useCallback, useState } from 'react';
import { z } from 'zod';
import { LoadingSpinner } from '../components/LoadingSpinner';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateReminder, generateTaskBreakdown, generateTimingRecommendation } from '../services/LLMService';

function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

const TodoSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  dueDate: z.date(),
  completed: z.boolean(),
  tags: z.array(z.string()),
  priority: z.enum(['low', 'medium', 'high']),
  createdAt: z.date(),
  completedAt: z.date().optional(),
  taskList: z.array(z.string()).optional(),
  reminder: z.string().optional(),
  llmAnalysis: z.object({
    recommendedTime: z.string(),
    reasoning: z.string(),
    confidence: z.number()
  }).optional(),
});

type Todo = z.infer<typeof TodoSchema>;

interface TodoContextType {
  todos: Todo[];
  addTodo: (todo: Omit<Todo, 'id'>) => Promise<void>;
  toggleTodo: (id: string) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  completeTodo: (id: string) => void;
  updateTodo: (id: string, updates: Partial<Todo>) => Promise<void>;
}

export const TodoContext = React.createContext<TodoContextType | undefined>(undefined);

type TodoAction = 
  | { type: 'SET_TODOS'; payload: Todo[] }
  | { type: 'ADD_TODO'; payload: Todo }
  | { type: 'DELETE_TODO'; id: string }
  | { type: 'COMPLETE_TODO'; id: string }
  | { type: 'UPDATE_TODO'; id: string; updates: Partial<Todo> };

function todoReducer(state: Todo[], action: TodoAction): Todo[] {
  switch (action.type) {
    case 'SET_TODOS':
      return action.payload;
    case 'ADD_TODO':
      return [...state, action.payload];
    case 'DELETE_TODO':
      return state.filter(todo => todo.id !== action.id);
    case 'COMPLETE_TODO':
      return state.map(todo => 
        todo.id === action.id 
          ? { ...todo, completed: true }
          : todo
      );
    case 'UPDATE_TODO':
      return state.map(todo =>
        todo.id === action.id ? { ...todo, ...action.updates } : todo
      );
    default:
      return state;
  }
}

export function TodoProvider({ children }: { children: React.ReactNode }) {
  const db = useSQLiteContext();
  const [isInitialized, setIsInitialized] = useState(false);
  const [todos, dispatch] = useReducer(todoReducer, []);

  // Define all callbacks outside of any conditional blocks
  const completeTodo = useCallback(async (id: string) => {
    try {
      await db.runAsync(
        'UPDATE todos SET completed = ? WHERE id = ?',
        [1, id]
      );
      dispatch({ type: 'COMPLETE_TODO', id });
    } catch (error) {
      console.error('Failed to complete todo:', error);
    }
  }, [db]);

  const addTodo = async (todoData: Omit<Todo, 'id' | 'createdAt' | 'taskList' | 'reminder' | 'recommendedTime'>) => {
    try {
      const timing = await generateTimingRecommendation(todoData);
      
      const newTodo = {
        ...todoData,
        id: generateId(),
        createdAt: new Date().toISOString(),
        completed: false,
        recommendedTime: timing.recommendedTime,
      };

      // Generate content ONCE
      const [reminder, taskList] = await Promise.all([
        generateReminder(newTodo),
        generateTaskBreakdown(newTodo)
      ]);

      // Create the complete todo with generated content
      const completeNewTodo = {
        ...newTodo,
        taskList,
        reminder
      };

      // Save to AsyncStorage with the generated content
      const existingTodos = await AsyncStorage.getItem('todos');
      const updatedTodos = existingTodos 
        ? [...JSON.parse(existingTodos), completeNewTodo] 
        : [completeNewTodo];
      
      await AsyncStorage.setItem('todos', JSON.stringify(updatedTodos));

      // Update state with the complete todo
      dispatch({ type: 'ADD_TODO', payload: completeNewTodo });
    } catch (error) {
      console.error('Error adding todo:', error);
      throw error;
    }
  };

  const deleteTodo = useCallback(async (id: string) => {
    try {
      await db.runAsync('DELETE FROM todos WHERE id = ?', [id]);
      dispatch({ type: 'DELETE_TODO', id });
    } catch (error) {
      console.error('Failed to delete todo:', error);
    }
  }, [db]);

  const updateTodo = async (id: string, updates: Partial<Todo>) => {
    try {
      dispatch({ type: 'UPDATE_TODO', id, updates });

      // If you're using AsyncStorage, update there as well
      const storedTodos = await AsyncStorage.getItem('todos');
      if (storedTodos) {
        const parsedTodos = JSON.parse(storedTodos);
        const updatedTodos = parsedTodos.map(todo => 
          todo.id === id ? { ...todo, ...updates } : todo
        );
        await AsyncStorage.setItem('todos', JSON.stringify(updatedTodos));
      }
    } catch (error) {
      console.error('Error updating todo:', error);
      throw error;
    }
  };

  useEffect(() => {
    const initDatabase = async () => {
      try {
        const result = await db.getAllAsync<any>('SELECT * FROM todos');
        const loadedTodos = result.map(row => ({
          ...row,
          dueDate: new Date(row.dueDate),
          completed: Boolean(row.completed),
          tags: JSON.parse(row.tags || '[]')
        }));
        dispatch({ type: 'SET_TODOS', payload: loadedTodos });
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize database:', error);
        setIsInitialized(true);
      }
    };

    initDatabase();
  }, [db]);

  useEffect(() => {
    const initializeTodos = async () => {
      try {
        const storedTodos = await AsyncStorage.getItem('todos');
        if (storedTodos) {
          dispatch({ type: 'SET_TODOS', payload: JSON.parse(storedTodos) });
        }
      } catch (error) {
        console.error('Error initializing todos:', error);
      }
    };
    
    initializeTodos();
  }, []);

  if (!isInitialized) {
    return <LoadingSpinner />;
  }

  return (
    <TodoContext.Provider value={{ 
      todos, 
      addTodo, 
      deleteTodo, 
      completeTodo,
      updateTodo
    }}>
      {children}
    </TodoContext.Provider>
  );
}

// Wrap the TodoProvider with SQLiteProvider
export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <SQLiteProvider 
      databaseName="todos.db"
      onInit={async (db) => {
        await db.execAsync('PRAGMA journal_mode = WAL');
      }}
      useSuspense
    >
      <TodoProvider>
        {children}
      </TodoProvider>
    </SQLiteProvider>
  );
}

export function useTodos() {
  const context = useContext(TodoContext);
  if (!context) {
    throw new Error('useTodos must be used within a TodoProvider');
  }
  return context;
} 