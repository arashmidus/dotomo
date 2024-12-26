import * as SQLite from 'expo-sqlite';
import { Todo } from '../types';

const db = SQLite.openDatabase('todos.db');

export const DatabaseService = {
  init(): Promise<void> {
    return new Promise((resolve, reject) => {
      db.transaction(
        (tx) => {
          tx.executeSql(
            `CREATE TABLE IF NOT EXISTS todos (
              id TEXT PRIMARY KEY NOT NULL,
              title TEXT NOT NULL,
              description TEXT,
              dueDate TEXT NOT NULL,
              completed INTEGER NOT NULL DEFAULT 0,
              createdAt TEXT NOT NULL
            );`,
            [],
            () => resolve(),
            (_, error) => {
              reject(error);
              return false;
            }
          );
        },
        (error) => reject(error)
      );
    });
  },

  getTodos(): Promise<Todo[]> {
    return new Promise((resolve, reject) => {
      db.transaction(
        (tx) => {
          tx.executeSql(
            'SELECT * FROM todos ORDER BY createdAt DESC;',
            [],
            (_, { rows: { _array } }) => {
              const todos = _array.map((row) => ({
                ...row,
                completed: Boolean(row.completed),
                dueDate: new Date(row.dueDate),
                createdAt: new Date(row.createdAt),
              }));
              resolve(todos);
            },
            (_, error) => {
              reject(error);
              return false;
            }
          );
        },
        (error) => reject(error)
      );
    });
  },

  addTodo(todo: Todo): Promise<void> {
    return new Promise((resolve, reject) => {
      db.transaction(
        (tx) => {
          tx.executeSql(
            `INSERT INTO todos (id, title, description, dueDate, completed, createdAt)
             VALUES (?, ?, ?, ?, ?, ?);`,
            [
              todo.id,
              todo.title,
              todo.description,
              todo.dueDate.toISOString(),
              todo.completed ? 1 : 0,
              todo.createdAt.toISOString(),
            ],
            () => resolve(),
            (_, error) => {
              reject(error);
              return false;
            }
          );
        },
        (error) => reject(error)
      );
    });
  },

  updateTodo(todo: Todo): Promise<void> {
    return new Promise((resolve, reject) => {
      db.transaction(
        (tx) => {
          tx.executeSql(
            `UPDATE todos
             SET title = ?, description = ?, dueDate = ?, completed = ?
             WHERE id = ?;`,
            [
              todo.title,
              todo.description,
              todo.dueDate.toISOString(),
              todo.completed ? 1 : 0,
              todo.id,
            ],
            () => resolve(),
            (_, error) => {
              reject(error);
              return false;
            }
          );
        },
        (error) => reject(error)
      );
    });
  },

  deleteTodo(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      db.transaction(
        (tx) => {
          tx.executeSql(
            'DELETE FROM todos WHERE id = ?;',
            [id],
            () => resolve(),
            (_, error) => {
              reject(error);
              return false;
            }
          );
        },
        (error) => reject(error)
      );
    });
  },
}; 