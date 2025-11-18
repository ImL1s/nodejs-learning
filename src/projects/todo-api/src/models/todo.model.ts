/**
 * Todo 數據模型（內存數據庫）
 */

import { Todo, CreateTodoDto, UpdateTodoDto, TodoQuery } from '../types';

class TodoModel {
  private todos: Todo[] = [];
  private nextId: number = 1;

  /**
   * 獲取所有 todos
   */
  findAll(query: TodoQuery = {}): Todo[] {
    let result = [...this.todos];

    // 過濾：完成狀態
    if (query.completed !== undefined) {
      const isCompleted = query.completed === 'true';
      result = result.filter((todo) => todo.completed === isCompleted);
    }

    // 過濾：優先級
    if (query.priority) {
      result = result.filter((todo) => todo.priority === query.priority);
    }

    // 排序
    if (query.sort) {
      const order = query.order === 'desc' ? -1 : 1;
      result.sort((a, b) => {
        const aVal = a[query.sort!];
        const bVal = b[query.sort!];
        if (aVal > bVal) return order;
        if (aVal < bVal) return -order;
        return 0;
      });
    }

    return result;
  }

  /**
   * 根據 ID 查找 todo
   */
  findById(id: number): Todo | undefined {
    return this.todos.find((todo) => todo.id === id);
  }

  /**
   * 創建新 todo
   */
  create(data: CreateTodoDto): Todo {
    const newTodo: Todo = {
      id: this.nextId++,
      title: data.title,
      description: data.description,
      completed: false,
      priority: data.priority || 'medium',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.todos.push(newTodo);
    return newTodo;
  }

  /**
   * 更新 todo
   */
  update(id: number, data: UpdateTodoDto): Todo | null {
    const index = this.todos.findIndex((todo) => todo.id === id);

    if (index === -1) {
      return null;
    }

    this.todos[index] = {
      ...this.todos[index],
      ...data,
      updatedAt: new Date(),
    };

    return this.todos[index];
  }

  /**
   * 刪除 todo
   */
  delete(id: number): boolean {
    const index = this.todos.findIndex((todo) => todo.id === id);

    if (index === -1) {
      return false;
    }

    this.todos.splice(index, 1);
    return true;
  }

  /**
   * 切換完成狀態
   */
  toggleComplete(id: number): Todo | null {
    const todo = this.findById(id);

    if (!todo) {
      return null;
    }

    return this.update(id, { completed: !todo.completed });
  }

  /**
   * 獲取統計信息
   */
  getStats() {
    const total = this.todos.length;
    const completed = this.todos.filter((t) => t.completed).length;
    const pending = total - completed;
    const byPriority = {
      high: this.todos.filter((t) => t.priority === 'high').length,
      medium: this.todos.filter((t) => t.priority === 'medium').length,
      low: this.todos.filter((t) => t.priority === 'low').length,
    };

    return {
      total,
      completed,
      pending,
      byPriority,
    };
  }

  /**
   * 重置模型（用於測試）
   */
  reset() {
    this.todos = [];
    this.nextId = 1;
  }
}

export default new TodoModel();
