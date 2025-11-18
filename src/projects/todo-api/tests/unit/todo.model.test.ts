/**
 * Todo Model Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Create a simple TodoModel class for testing
class TodoModel {
  private todos: Array<{
    id: number;
    title: string;
    description?: string;
    completed: boolean;
    priority: 'low' | 'medium' | 'high';
    createdAt: Date;
    updatedAt: Date;
  }> = [];
  private nextId: number = 1;

  findAll(query: any = {}) {
    let result = [...this.todos];

    if (query.completed !== undefined) {
      const isCompleted = query.completed === 'true';
      result = result.filter((todo) => todo.completed === isCompleted);
    }

    if (query.priority) {
      result = result.filter((todo) => todo.priority === query.priority);
    }

    if (query.sort) {
      const order = query.order === 'desc' ? -1 : 1;
      result.sort((a: any, b: any) => {
        const aVal = a[query.sort!];
        const bVal = b[query.sort!];
        if (aVal > bVal) return order;
        if (aVal < bVal) return -order;
        return 0;
      });
    }

    return result;
  }

  findById(id: number) {
    return this.todos.find((todo) => todo.id === id);
  }

  create(data: any) {
    const newTodo = {
      id: this.nextId++,
      title: data.title,
      description: data.description,
      completed: false,
      priority: data.priority || 'medium' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.todos.push(newTodo);
    return newTodo;
  }

  update(id: number, data: any) {
    const index = this.todos.findIndex((todo) => todo.id === id);
    if (index === -1) return null;

    this.todos[index] = {
      ...this.todos[index],
      ...data,
      updatedAt: new Date(),
    };
    return this.todos[index];
  }

  delete(id: number) {
    const index = this.todos.findIndex((todo) => todo.id === id);
    if (index === -1) return false;

    this.todos.splice(index, 1);
    return true;
  }

  toggleComplete(id: number) {
    const todo = this.findById(id);
    if (!todo) return null;

    return this.update(id, { completed: !todo.completed });
  }

  getStats() {
    const total = this.todos.length;
    const completed = this.todos.filter((t) => t.completed).length;
    const pending = total - completed;
    const byPriority = {
      high: this.todos.filter((t) => t.priority === 'high').length,
      medium: this.todos.filter((t) => t.priority === 'medium').length,
      low: this.todos.filter((t) => t.priority === 'low').length,
    };

    return { total, completed, pending, byPriority };
  }
}

describe('TodoModel', () => {
  let todoModel: TodoModel;

  beforeEach(() => {
    // Create a fresh instance for each test
    todoModel = new TodoModel();
  });

  describe('create', () => {
    it('should create a new todo with all fields', () => {
      // Arrange
      const data = {
        title: 'Test Todo',
        description: 'Test description',
        priority: 'high' as const,
      };

      // Act
      const todo = todoModel.create(data);

      // Assert
      expect(todo).toMatchObject({
        id: 1,
        title: 'Test Todo',
        description: 'Test description',
        completed: false,
        priority: 'high',
      });
      expect(todo.createdAt).toBeInstanceOf(Date);
      expect(todo.updatedAt).toBeInstanceOf(Date);
    });

    it('should create todo with default priority if not provided', () => {
      // Arrange
      const data = {
        title: 'Test Todo',
      };

      // Act
      const todo = todoModel.create(data);

      // Assert
      expect(todo.priority).toBe('medium');
    });

    it('should auto-increment IDs', () => {
      // Act
      const todo1 = todoModel.create({ title: 'Todo 1' });
      const todo2 = todoModel.create({ title: 'Todo 2' });
      const todo3 = todoModel.create({ title: 'Todo 3' });

      // Assert
      expect(todo1.id).toBe(1);
      expect(todo2.id).toBe(2);
      expect(todo3.id).toBe(3);
    });

    it('should set completed to false by default', () => {
      // Act
      const todo = todoModel.create({ title: 'Test Todo' });

      // Assert
      expect(todo.completed).toBe(false);
    });

    it('should handle todos without description', () => {
      // Act
      const todo = todoModel.create({ title: 'Test Todo' });

      // Assert
      expect(todo.description).toBeUndefined();
    });
  });

  describe('findAll', () => {
    beforeEach(() => {
      // Set up test data
      todoModel.create({ title: 'Todo 1', priority: 'high' });
      todoModel.create({ title: 'Todo 2', priority: 'medium' });
      todoModel.create({ title: 'Todo 3', priority: 'low' });
    });

    it('should return all todos when no query is provided', () => {
      // Act
      const todos = todoModel.findAll();

      // Assert
      expect(todos).toHaveLength(3);
    });

    it('should filter by completed status', () => {
      // Arrange
      todoModel.update(1, { completed: true });

      // Act
      const completedTodos = todoModel.findAll({ completed: 'true' });
      const pendingTodos = todoModel.findAll({ completed: 'false' });

      // Assert
      expect(completedTodos).toHaveLength(1);
      expect(pendingTodos).toHaveLength(2);
    });

    it('should filter by priority', () => {
      // Act
      const highPriority = todoModel.findAll({ priority: 'high' });
      const mediumPriority = todoModel.findAll({ priority: 'medium' });
      const lowPriority = todoModel.findAll({ priority: 'low' });

      // Assert
      expect(highPriority).toHaveLength(1);
      expect(mediumPriority).toHaveLength(1);
      expect(lowPriority).toHaveLength(1);
    });

    it('should sort by createdAt in ascending order', () => {
      // Act
      const todos = todoModel.findAll({ sort: 'createdAt', order: 'asc' });

      // Assert
      expect(todos[0].id).toBe(1);
      expect(todos[2].id).toBe(3);
    });

    it('should sort by createdAt in descending order', () => {
      // Act
      const todos = todoModel.findAll({ sort: 'createdAt', order: 'desc' });

      // Assert
      expect(todos[0].id).toBe(3);
      expect(todos[2].id).toBe(1);
    });

    it('should combine filters and sorting', () => {
      // Arrange
      todoModel.update(1, { completed: true });
      todoModel.update(3, { completed: true });

      // Act
      const todos = todoModel.findAll({
        completed: 'true',
        sort: 'createdAt',
        order: 'desc',
      });

      // Assert
      expect(todos).toHaveLength(2);
      expect(todos[0].id).toBe(3);
      expect(todos[1].id).toBe(1);
    });
  });

  describe('findById', () => {
    it('should return todo if ID exists', () => {
      // Arrange
      const created = todoModel.create({ title: 'Test Todo' });

      // Act
      const found = todoModel.findById(created.id);

      // Assert
      expect(found).toEqual(created);
    });

    it('should return undefined if ID does not exist', () => {
      // Act
      const found = todoModel.findById(999);

      // Assert
      expect(found).toBeUndefined();
    });

    it('should return correct todo when multiple exist', () => {
      // Arrange
      todoModel.create({ title: 'Todo 1' });
      const todo2 = todoModel.create({ title: 'Todo 2' });
      todoModel.create({ title: 'Todo 3' });

      // Act
      const found = todoModel.findById(todo2.id);

      // Assert
      expect(found?.title).toBe('Todo 2');
    });
  });

  describe('update', () => {
    it('should update todo successfully', () => {
      // Arrange
      const created = todoModel.create({ title: 'Original Title' });

      // Act
      const updated = todoModel.update(created.id, {
        title: 'Updated Title',
        completed: true,
      });

      // Assert
      expect(updated).toMatchObject({
        id: created.id,
        title: 'Updated Title',
        completed: true,
      });
    });

    it('should update updatedAt timestamp', () => {
      // Arrange
      const created = todoModel.create({ title: 'Test Todo' });
      const originalUpdatedAt = created.updatedAt;

      // Wait a bit to ensure different timestamp
      const waitTime = 10;
      const start = Date.now();
      while (Date.now() - start < waitTime) {
        // Wait
      }

      // Act
      const updated = todoModel.update(created.id, { title: 'Updated' });

      // Assert
      expect(updated?.updatedAt.getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime()
      );
    });

    it('should partially update todo', () => {
      // Arrange
      const created = todoModel.create({
        title: 'Test Todo',
        description: 'Original description',
        priority: 'high',
      });

      // Act
      const updated = todoModel.update(created.id, {
        description: 'Updated description',
      });

      // Assert
      expect(updated).toMatchObject({
        title: 'Test Todo', // unchanged
        description: 'Updated description', // updated
        priority: 'high', // unchanged
      });
    });

    it('should return null if todo does not exist', () => {
      // Act
      const updated = todoModel.update(999, { title: 'Updated' });

      // Assert
      expect(updated).toBeNull();
    });

    it('should preserve other fields when updating', () => {
      // Arrange
      const created = todoModel.create({
        title: 'Test Todo',
        description: 'Test description',
        priority: 'high',
      });

      // Act
      todoModel.update(created.id, { completed: true });
      const found = todoModel.findById(created.id);

      // Assert
      expect(found).toMatchObject({
        title: 'Test Todo',
        description: 'Test description',
        priority: 'high',
        completed: true,
      });
    });
  });

  describe('delete', () => {
    it('should delete todo successfully', () => {
      // Arrange
      const created = todoModel.create({ title: 'Test Todo' });

      // Act
      const result = todoModel.delete(created.id);

      // Assert
      expect(result).toBe(true);
      expect(todoModel.findById(created.id)).toBeUndefined();
    });

    it('should return false if todo does not exist', () => {
      // Act
      const result = todoModel.delete(999);

      // Assert
      expect(result).toBe(false);
    });

    it('should not affect other todos', () => {
      // Arrange
      const todo1 = todoModel.create({ title: 'Todo 1' });
      const todo2 = todoModel.create({ title: 'Todo 2' });
      const todo3 = todoModel.create({ title: 'Todo 3' });

      // Act
      todoModel.delete(todo2.id);

      // Assert
      expect(todoModel.findById(todo1.id)).toBeDefined();
      expect(todoModel.findById(todo2.id)).toBeUndefined();
      expect(todoModel.findById(todo3.id)).toBeDefined();
    });

    it('should reduce total count after deletion', () => {
      // Arrange
      todoModel.create({ title: 'Todo 1' });
      todoModel.create({ title: 'Todo 2' });

      // Act
      const beforeCount = todoModel.findAll().length;
      todoModel.delete(1);
      const afterCount = todoModel.findAll().length;

      // Assert
      expect(beforeCount).toBe(2);
      expect(afterCount).toBe(1);
    });
  });

  describe('toggleComplete', () => {
    it('should toggle completed from false to true', () => {
      // Arrange
      const created = todoModel.create({ title: 'Test Todo' });

      // Act
      const toggled = todoModel.toggleComplete(created.id);

      // Assert
      expect(toggled?.completed).toBe(true);
    });

    it('should toggle completed from true to false', () => {
      // Arrange
      const created = todoModel.create({ title: 'Test Todo' });
      todoModel.update(created.id, { completed: true });

      // Act
      const toggled = todoModel.toggleComplete(created.id);

      // Assert
      expect(toggled?.completed).toBe(false);
    });

    it('should return null if todo does not exist', () => {
      // Act
      const toggled = todoModel.toggleComplete(999);

      // Assert
      expect(toggled).toBeNull();
    });

    it('should update updatedAt when toggling', () => {
      // Arrange
      const created = todoModel.create({ title: 'Test Todo' });
      const originalUpdatedAt = created.updatedAt;

      // Wait a bit
      const waitTime = 10;
      const start = Date.now();
      while (Date.now() - start < waitTime) {
        // Wait
      }

      // Act
      const toggled = todoModel.toggleComplete(created.id);

      // Assert
      expect(toggled?.updatedAt.getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime()
      );
    });
  });

  describe('getStats', () => {
    it('should return correct stats for empty list', () => {
      // Act
      const stats = todoModel.getStats();

      // Assert
      expect(stats).toEqual({
        total: 0,
        completed: 0,
        pending: 0,
        byPriority: {
          high: 0,
          medium: 0,
          low: 0,
        },
      });
    });

    it('should return correct stats for todos', () => {
      // Arrange
      todoModel.create({ title: 'Todo 1', priority: 'high' });
      todoModel.create({ title: 'Todo 2', priority: 'medium' });
      todoModel.create({ title: 'Todo 3', priority: 'low' });
      todoModel.update(1, { completed: true });

      // Act
      const stats = todoModel.getStats();

      // Assert
      expect(stats).toEqual({
        total: 3,
        completed: 1,
        pending: 2,
        byPriority: {
          high: 1,
          medium: 1,
          low: 1,
        },
      });
    });

    it('should update stats after operations', () => {
      // Arrange
      const todo1 = todoModel.create({ title: 'Todo 1', priority: 'high' });
      const todo2 = todoModel.create({ title: 'Todo 2', priority: 'high' });

      // Act
      todoModel.update(todo1.id, { completed: true });
      todoModel.delete(todo2.id);
      const stats = todoModel.getStats();

      // Assert
      expect(stats).toEqual({
        total: 1,
        completed: 1,
        pending: 0,
        byPriority: {
          high: 1,
          medium: 0,
          low: 0,
        },
      });
    });

    it('should count todos by priority correctly', () => {
      // Arrange
      todoModel.create({ title: 'High 1', priority: 'high' });
      todoModel.create({ title: 'High 2', priority: 'high' });
      todoModel.create({ title: 'Medium 1', priority: 'medium' });
      todoModel.create({ title: 'Low 1', priority: 'low' });
      todoModel.create({ title: 'Low 2', priority: 'low' });
      todoModel.create({ title: 'Low 3', priority: 'low' });

      // Act
      const stats = todoModel.getStats();

      // Assert
      expect(stats.byPriority).toEqual({
        high: 2,
        medium: 1,
        low: 3,
      });
    });
  });
});
