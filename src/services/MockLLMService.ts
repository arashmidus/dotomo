import { Todo } from '../contexts/TodoContext';
import { format } from 'date-fns';

const PRIORITY_PHRASES = {
  high: ['This is a high-priority task that needs your attention.', 'Don\'t forget this important task!'],
  medium: ['Keep this task in mind.', 'Make sure to complete this task on time.'],
  low: ['When you have time, take care of this task.', 'This task is on your list.'],
};

const TIME_PHRASES = {
  soon: 'The deadline is approaching.',
  future: 'You have some time, but plan accordingly.',
  urgent: 'This task is due very soon!',
};

export async function mockGenerateNotificationContent(todo: Todo): Promise<string> {
  const priorityPhrase = PRIORITY_PHRASES[todo.priority][Math.floor(Math.random() * PRIORITY_PHRASES[todo.priority].length)];
  
  const timeUntilDue = todo.dueDate.getTime() - Date.now();
  const hoursUntilDue = timeUntilDue / (1000 * 60 * 60);
  
  let timePhrase = TIME_PHRASES.future;
  if (hoursUntilDue < 2) timePhrase = TIME_PHRASES.urgent;
  else if (hoursUntilDue < 24) timePhrase = TIME_PHRASES.soon;

  const content = [
    priorityPhrase,
    timePhrase,
    `Due: ${format(todo.dueDate, 'PPP')}`,
    todo.description && `Details: ${todo.description}`,
    todo.tags.length > 0 && `Tags: ${todo.tags.join(', ')}`,
  ]
    .filter(Boolean)
    .join('\n');

  return content;
} 