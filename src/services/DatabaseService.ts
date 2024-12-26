import * as SQLite from 'expo-sqlite';
import { Todo } from '../types/Todo';

class DatabaseService {
  private static instance: DatabaseService;
  private db: SQLite.SQLiteDatabase | null = null;

  private constructor() {}

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  async initialize(): Promise<void> {
    if (!this.db) {
      this.db = await SQLite.openDatabaseAsync('todos.db');
      await this.db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS todos (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          dueDate TEXT NOT NULL,
          completed INTEGER NOT NULL DEFAULT 0,
          tags TEXT,
          priority TEXT NOT NULL
        );
      `);
    }
  }

  async getTodos(): Promise<Todo[]> {
    if (!this.db) throw new Error('Database not initialized');
    const result = await this.db.getAllAsync<any>('SELECT * FROM todos');
    return result.map(row => ({
      ...row,
      dueDate: new Date(row.dueDate),
      completed: Boolean(row.completed),
      tags: JSON.parse(row.tags || '[]')
    }));
  }

  async addTodo(todo: Omit<Todo, 'id'>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    const id = Math.random().toString(36).slice(2);
    await this.db.runAsync(
      'INSERT INTO todos (id, title, description, dueDate, completed, tags, priority) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        todo.title,
        todo.description || null,
        todo.dueDate.toISOString(),
        todo.completed ? 1 : 0,
        JSON.stringify(todo.tags),
        todo.priority
      ]
    );
  }

  async deleteTodo(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync('DELETE FROM todos WHERE id = ?', [id]);
  }

  async updateTodo(todo: Todo): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync(
      'UPDATE todos SET title = ?, description = ?, dueDate = ?, completed = ?, tags = ?, priority = ? WHERE id = ?',
      [
        todo.title,
        todo.description || null,
        todo.dueDate.toISOString(),
        todo.completed ? 1 : 0,
        JSON.stringify(todo.tags),
        todo.priority,
        todo.id
      ]
    );
  }
}

export const db = DatabaseService.getInstance(); 