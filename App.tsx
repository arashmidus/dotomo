import { SQLiteProvider } from 'expo-sqlite';
import { Suspense } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { TodoProvider } from './src/contexts/TodoContext';
import { LoadingSpinner } from './src/components/LoadingSpinner';
import { SettingsProvider } from './src/contexts/SettingsContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { LogBox } from 'react-native';
import { configureReanimatedLogger } from 'react-native-reanimated';

LogBox.ignoreLogs([
  "[Reanimated] Reading from `value` during component render"
]);

configureReanimatedLogger({
  strict: false  // This disables strict mode warnings
});

export default function App() {
  
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <SafeAreaProvider>
          <SafeAreaView 
            style={{ flex: 1 }} 
            edges={['right', 'left', 'bottom']} // Exclude bottom edge
          >
            <Suspense fallback={<LoadingSpinner />}>
              <SQLiteProvider 
                databaseName="todos.db"
                onInit={async (db) => {
                  await db.execAsync(`
                    PRAGMA journal_mode = WAL;
                    CREATE TABLE IF NOT EXISTS todos (
                      id TEXT PRIMARY KEY NOT NULL,
                      title TEXT NOT NULL,
                      description TEXT,
                      dueDate TEXT NOT NULL,
                      completed INTEGER NOT NULL DEFAULT 0,
                      tags TEXT,
                      priority TEXT NOT NULL
                    );
                  `);
                }}
                useSuspense
              >
                <SettingsProvider>
                  <TodoProvider>
                    <AppNavigator />
                  </TodoProvider>
                </SettingsProvider>
              </SQLiteProvider>
            </Suspense>
          </SafeAreaView>
        </SafeAreaProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
} 