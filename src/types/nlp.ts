export interface ParsedTodo {
  title: string;
  dueDate: Date | null;
  priority: 'low' | 'medium' | 'high' | null;
  tags: string[];
  description?: string;
}

export interface TokenMatch {
  type: 'date' | 'priority' | 'tag';
  value: string;
  index: number;
} 