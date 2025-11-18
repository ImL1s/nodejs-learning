/**
 * Todo Model Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import TodoModelClass from '../../src/models/todo.model.js';

// We need to access the class to create fresh instances for testing
// The actual export is a singleton, so we'll work with that
describe('TodoModel', () => {
  // We'll use the singleton instance but clear its state before each test
  beforeEach(() => {
    // Reset the model state using the reset method
    TodoModelClass.reset();
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
      const todo = TodoModelClass.create(data);

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
      const todo = TodoModelClass.create(data);

      // Assert
      expect(todo.priority).toBe('medium');
    });

    it('should auto-increment IDs', () => {
      // Act
      const todo1 = TodoModelClass.create({ title: 'Todo 1' });
      const todo2 = TodoModelClass.create({ title: 'Todo 2' });
      const todo3 = TodoModelClass.create({ title: 'Todo 3' });

      // Assert
      expect(todo1.id).toBe(1);
      expect(todo2.id).toBe(2);
      expect(todo3.id).toBe(3);
    });

    it('should set completed to false by default', () => {
      // Act
      const todo = TodoModelClass.create({ title: 'Test Todo' });

      // Assert
      expect(todo.completed).toBe(false);
    });

    it('should handle todos without description', () => {
      // Act
      const todo = TodoModelClass.create({ title: 'Test Todo' });

      // Assert
      expect(todo.description).toBeUndefined();
    });
  });

  describe('findAll', () => {
    beforeEach(() => {
      // Set up test data with small delays to ensure different timestamps
      TodoModelClass.create({ title: 'Todo 1', priority: 'high' });

      // Small delay to ensure different createdAt
      const start1 = Date.now();
      while (Date.now() - start1 < 2) { /* wait */ }

      TodoModelClass.create({ title: 'Todo 2', priority: 'medium' });

      // Small delay to ensure different createdAt
      const start2 = Date.now();
      while (Date.now() - start2 < 2) { /* wait */ }

      TodoModelClass.create({ title: 'Todo 3', priority: 'low' });
    });

    it('should return all todos when no query is provided', () => {
      // Act
      const todos = TodoModelClass.findAll();

      // Assert
      expect(todos).toHaveLength(3);
    });

    it('should filter by completed status', () => {
      // Arrange
      TodoModelClass.update(1, { completed: true });

      // Act
      const completedTodos = TodoModelClass.findAll({ completed: 'true' });
      const pendingTodos = TodoModelClass.findAll({ completed: 'false' });

      // Assert
      expect(completedTodos).toHaveLength(1);
      expect(pendingTodos).toHaveLength(2);
    });

    it('should filter by priority', () => {
      // Act
      const highPriority = TodoModelClass.findAll({ priority: 'high' });
      const mediumPriority = TodoModelClass.findAll({ priority: 'medium' });
      const lowPriority = TodoModelClass.findAll({ priority: 'low' });

      // Assert
      expect(highPriority).toHaveLength(1);
      expect(mediumPriority).toHaveLength(1);
      expect(lowPriority).toHaveLength(1);
    });

    it('should sort by createdAt in ascending order', () => {
      // Act
      const todos = TodoModelClass.findAll({ sort: 'createdAt', order: 'asc' });

      // Assert
      expect(todos[0].id).toBe(1);
      expect(todos[2].id).toBe(3);
    });

    it('should sort by createdAt in descending order', () => {
      // Act
      const todos = TodoModelClass.findAll({ sort: 'createdAt', order: 'desc' });

      // Assert
      expect(todos[0].id).toBe(3);
      expect(todos[2].id).toBe(1);
    });

    it('should combine filters and sorting', () => {
      // Arrange
      TodoModelClass.update(1, { completed: true });
      TodoModelClass.update(3, { completed: true });

      // Act
      const todos = TodoModelClass.findAll({
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
      const created = TodoModelClass.create({ title: 'Test Todo' });

      // Act
      const found = TodoModelClass.findById(created.id);

      // Assert
      expect(found).toEqual(created);
    });

    it('should return undefined if ID does not exist', () => {
      // Act
      const found = TodoModelClass.findById(999);

      // Assert
      expect(found).toBeUndefined();
    });

    it('should return correct todo when multiple exist', () => {
      // Arrange
      TodoModelClass.create({ title: 'Todo 1' });
      const todo2 = TodoModelClass.create({ title: 'Todo 2' });
      TodoModelClass.create({ title: 'Todo 3' });

      // Act
      const found = TodoModelClass.findById(todo2.id);

      // Assert
      expect(found?.title).toBe('Todo 2');
    });
  });

  describe('update', () => {
    it('should update todo successfully', () => {
      // Arrange
      const created = TodoModelClass.create({ title: 'Original Title' });

      // Act
      const updated = TodoModelClass.update(created.id, {
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
      const created = TodoModelClass.create({ title: 'Test Todo' });
      const originalUpdatedAt = created.updatedAt;

      // Wait a bit to ensure different timestamp
      const waitTime = 10;
      const start = Date.now();
      while (Date.now() - start < waitTime) {
        // Wait
      }

      // Act
      const updated = TodoModelClass.update(created.id, { title: 'Updated' });

      // Assert
      expect(updated?.updatedAt.getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime()
      );
    });

    it('should partially update todo', () => {
      // Arrange
      const created = TodoModelClass.create({
        title: 'Test Todo',
        description: 'Original description',
        priority: 'high',
      });

      // Act
      const updated = TodoModelClass.update(created.id, {
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
      const updated = TodoModelClass.update(999, { title: 'Updated' });

      // Assert
      expect(updated).toBeNull();
    });

    it('should preserve other fields when updating', () => {
      // Arrange
      const created = TodoModelClass.create({
        title: 'Test Todo',
        description: 'Test description',
        priority: 'high',
      });

      // Act
      TodoModelClass.update(created.id, { completed: true });
      const found = TodoModelClass.findById(created.id);

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
      const created = TodoModelClass.create({ title: 'Test Todo' });

      // Act
      const result = TodoModelClass.delete(created.id);

      // Assert
      expect(result).toBe(true);
      expect(TodoModelClass.findById(created.id)).toBeUndefined();
    });

    it('should return false if todo does not exist', () => {
      // Act
      const result = TodoModelClass.delete(999);

      // Assert
      expect(result).toBe(false);
    });

    it('should not affect other todos', () => {
      // Arrange
      const todo1 = TodoModelClass.create({ title: 'Todo 1' });
      const todo2 = TodoModelClass.create({ title: 'Todo 2' });
      const todo3 = TodoModelClass.create({ title: 'Todo 3' });

      // Act
      TodoModelClass.delete(todo2.id);

      // Assert
      expect(TodoModelClass.findById(todo1.id)).toBeDefined();
      expect(TodoModelClass.findById(todo2.id)).toBeUndefined();
      expect(TodoModelClass.findById(todo3.id)).toBeDefined();
    });

    it('should reduce total count after deletion', () => {
      // Arrange
      TodoModelClass.create({ title: 'Todo 1' });
      TodoModelClass.create({ title: 'Todo 2' });

      // Act
      const beforeCount = TodoModelClass.findAll().length;
      TodoModelClass.delete(1);
      const afterCount = TodoModelClass.findAll().length;

      // Assert
      expect(beforeCount).toBe(2);
      expect(afterCount).toBe(1);
    });
  });

  describe('toggleComplete', () => {
    it('should toggle completed from false to true', () => {
      // Arrange
      const created = TodoModelClass.create({ title: 'Test Todo' });

      // Act
      const toggled = TodoModelClass.toggleComplete(created.id);

      // Assert
      expect(toggled?.completed).toBe(true);
    });

    it('should toggle completed from true to false', () => {
      // Arrange
      const created = TodoModelClass.create({ title: 'Test Todo' });
      TodoModelClass.update(created.id, { completed: true });

      // Act
      const toggled = TodoModelClass.toggleComplete(created.id);

      // Assert
      expect(toggled?.completed).toBe(false);
    });

    it('should return null if todo does not exist', () => {
      // Act
      const toggled = TodoModelClass.toggleComplete(999);

      // Assert
      expect(toggled).toBeNull();
    });

    it('should update updatedAt when toggling', () => {
      // Arrange
      const created = TodoModelClass.create({ title: 'Test Todo' });
      const originalUpdatedAt = created.updatedAt;

      // Wait a bit
      const waitTime = 10;
      const start = Date.now();
      while (Date.now() - start < waitTime) {
        // Wait
      }

      // Act
      const toggled = TodoModelClass.toggleComplete(created.id);

      // Assert
      expect(toggled?.updatedAt.getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime()
      );
    });
  });

  describe('getStats', () => {
    it('should return correct stats for empty list', () => {
      // Act
      const stats = TodoModelClass.getStats();

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
      TodoModelClass.create({ title: 'Todo 1', priority: 'high' });
      TodoModelClass.create({ title: 'Todo 2', priority: 'medium' });
      TodoModelClass.create({ title: 'Todo 3', priority: 'low' });
      TodoModelClass.update(1, { completed: true });

      // Act
      const stats = TodoModelClass.getStats();

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
      const todo1 = TodoModelClass.create({ title: 'Todo 1', priority: 'high' });
      const todo2 = TodoModelClass.create({ title: 'Todo 2', priority: 'high' });

      // Act
      TodoModelClass.update(todo1.id, { completed: true });
      TodoModelClass.delete(todo2.id);
      const stats = TodoModelClass.getStats();

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
      TodoModelClass.create({ title: 'High 1', priority: 'high' });
      TodoModelClass.create({ title: 'High 2', priority: 'high' });
      TodoModelClass.create({ title: 'Medium 1', priority: 'medium' });
      TodoModelClass.create({ title: 'Low 1', priority: 'low' });
      TodoModelClass.create({ title: 'Low 2', priority: 'low' });
      TodoModelClass.create({ title: 'Low 3', priority: 'low' });

      // Act
      const stats = TodoModelClass.getStats();

      // Assert
      expect(stats.byPriority).toEqual({
        high: 2,
        medium: 1,
        low: 3,
      });
    });
  });
});
