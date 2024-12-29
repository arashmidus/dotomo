import React from 'react';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { createContext, useContext, useReducer, useEffect, useCallback, useState } from 'react';
import { z } from 'zod';
import { LoadingSpinner } from '../components/LoadingSpinner';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateReminder, generateTaskBreakdown, generateTimingRecommendation } from '../services/LLMService';
import { useSettings } from './SettingsContext';

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
  const { settings } = useSettings();
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
      console.log('\n🎯 ==================== ADDING NEW TODO ====================');
      console.log('📝 Todo Data:', todoData);
      console.log('⚙️ Current Settings:', settings);
      
      const timing = await generateTimingRecommendation(todoData, settings);
      console.log('🕒 LLM Timing Analysis:', timing);
      
      const newTodo = {
        ...todoData,
        id: generateId(),
        createdAt: new Date().toISOString(),
        completed: false,
        llmAnalysis: timing,
      };
      console.log('🆕 Created Todo Base:', newTodo);

      // Generate content ONCE
      console.log('🤖 Generating AI Content...');
      const [reminder, taskList] = await Promise.all([
        generateReminder(newTodo),
        generateTaskBreakdown(newTodo)
      ]);
      console.log('✨ Generated Reminder:', reminder);
      console.log('📋 Generated Task List:', taskList);

      const completeNewTodo = {
        ...newTodo,
        taskList,
        reminder
      };
      console.log('✅ Complete Todo Object:', completeNewTodo);

      // Save to AsyncStorage
      console.log('💾 Saving to Storage...');
      const existingTodos = await AsyncStorage.getItem('todos');
      const updatedTodos = existingTodos 
        ? [...JSON.parse(existingTodos), completeNewTodo] 
        : [completeNewTodo];
      
      await AsyncStorage.setItem('todos', JSON.stringify(updatedTodos));
      console.log('✅ Storage Updated Successfully');

      // Update state
      dispatch({ type: 'ADD_TODO', payload: completeNewTodo });
      console.log('🎉 Todo Added Successfully!');
      console.log('=====================================================\n');
    } catch (error) {
      console.error('❌ ERROR ADDING TODO ❌');
      console.error('==================');
      console.error(error);
      console.error('==================');
      throw error;
    }
  };

  const deleteTodo = useCallback(async (id: string) => {
    try {
      console.log('\n🗑️ ==================== DELETING TODO ====================');
      console.log('🔑 Todo ID:', id);
      
      await db.runAsync('DELETE FROM todos WHERE id = ?', [id]);
      dispatch({ type: 'DELETE_TODO', id });
      
      console.log('✅ Todo Deleted Successfully');
      console.log('=====================================================\n');
    } catch (error) {
      console.error('❌ ERROR DELETING TODO ❌');
      console.error('==================');
      console.error(error);
      console.error('==================');
    }
  }, [db]);

  const updateTodo = async (id: string, updates: Partial<Todo>) => {
    try {
      console.log('\n📝 ==================== UPDATING TODO ====================');
      console.log('🔑 Todo ID:', id);
      console.log('🔄 Updates:', updates);
      
      dispatch({ type: 'UPDATE_TODO', id, updates });

      const storedTodos = await AsyncStorage.getItem('todos');
      if (storedTodos) {
        const parsedTodos = JSON.parse(storedTodos);
        const updatedTodos = parsedTodos.map(todo => 
          todo.id === id ? { ...todo, ...updates } : todo
        );
        await AsyncStorage.setItem('todos', JSON.stringify(updatedTodos));
        console.log('💾 Storage Updated Successfully');
      }
      
      console.log('✅ Todo Updated Successfully');
      console.log('=====================================================\n');
    } catch (error) {
      console.error('❌ ERROR UPDATING TODO ❌');
      console.error('==================');
      console.error(error);
      console.error('==================');
      throw error;
    }
  };

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('\n🔄 ==================== INITIALIZING APP ====================');
        
        // First try AsyncStorage
        const storedTodos = await AsyncStorage.getItem('todos');
        if (storedTodos) {
          const parsedTodos = JSON.parse(storedTodos);
          console.log('📱 Loaded from AsyncStorage:', parsedTodos.length, 'todos');
          dispatch({ type: 'SET_TODOS', payload: parsedTodos });
          setIsInitialized(true);
          return; // Exit if we loaded from AsyncStorage
        }

        // If no AsyncStorage data, try SQLite as fallback
        console.log('💽 No AsyncStorage data, checking SQLite...');
        const result = await db.getAllAsync<any>('SELECT * FROM todos');
        const loadedTodos = result.map(row => ({
          ...row,
          dueDate: new Date(row.dueDate),
          completed: Boolean(row.completed),
          tags: JSON.parse(row.tags || '[]')
        }));
        
        if (loadedTodos.length > 0) {
          console.log('📚 Loaded from SQLite:', loadedTodos.length, 'todos');
          // Save to AsyncStorage for future use
          await AsyncStorage.setItem('todos', JSON.stringify(loadedTodos));
          dispatch({ type: 'SET_TODOS', payload: loadedTodos });
        } else {
          console.log('❌ No todos found in either storage');
        }
        
        console.log('✅ Initialization Complete');
        console.log('=====================================================\n');
        setIsInitialized(true);
      } catch (error) {
        console.error('❌ INITIALIZATION ERROR ❌');
        console.error(error);
        setIsInitialized(true); // Still set initialized to prevent hanging
      }
    };

    initializeApp();
  }, [db]);

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