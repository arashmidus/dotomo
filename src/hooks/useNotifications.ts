import { useEffect, useRef } from 'react';
import { useTodos } from '../contexts/TodoContext';
import { useSettings } from '../contexts/SettingsContext';
import { NotificationService } from '../services/NotificationService';

export function useNotifications() {
  const { todos } = useTodos();
  const { settings } = useSettings();
  const previousTodos = useRef<typeof todos>([]);

  useEffect(() => {
    if (!settings.notifications.enabled) return;

    // Only send notification for newly added todos
    const newTodos = todos.filter(
      todo => !previousTodos.current.find(pt => pt.id === todo.id)
    );

    newTodos.forEach(todo => {
      if (!todo.completed) {
        NotificationService.scheduleNotification(todo, settings.notifications);
      }
    });

    previousTodos.current = todos;
  }, [todos, settings.notifications]);
} 