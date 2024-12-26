export interface Todo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  dueDate: Date;
  createdAt: Date | string;
  // ... other fields
} 