/**
 * 測試範例 2: 異步函數測試
 *
 * 學習目標：
 * - 測試 async/await 函數
 * - 測試 Promise
 * - 使用 Mock
 */

import { describe, it, expect, vi } from 'vitest';

// 模擬異步函數
async function fetchUser(id: number): Promise<{ id: number; name: string; email: string }> {
  // 模擬 API 調用延遲
  await new Promise((resolve) => setTimeout(resolve, 100));

  if (id <= 0) {
    throw new Error('Invalid user ID');
  }

  return {
    id,
    name: `User ${id}`,
    email: `user${id}@example.com`,
  };
}

async function fetchUsers(): Promise<Array<{ id: number; name: string }>> {
  await new Promise((resolve) => setTimeout(resolve, 50));

  return [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
    { id: 3, name: 'Charlie' },
  ];
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 測試
describe('異步函數測試', () => {
  describe('fetchUser()', () => {
    it('應該成功獲取用戶數據', async () => {
      const user = await fetchUser(1);

      expect(user).toEqual({
        id: 1,
        name: 'User 1',
        email: 'user1@example.com',
      });
    });

    it('應該處理多個用戶', async () => {
      const user1 = await fetchUser(1);
      const user2 = await fetchUser(2);

      expect(user1.id).toBe(1);
      expect(user2.id).toBe(2);
    });

    it('無效的 ID 應該拋出錯誤', async () => {
      await expect(fetchUser(0)).rejects.toThrow('Invalid user ID');
      await expect(fetchUser(-1)).rejects.toThrow('Invalid user ID');
    });
  });

  describe('fetchUsers()', () => {
    it('應該返回用戶列表', async () => {
      const users = await fetchUsers();

      expect(users).toHaveLength(3);
      expect(users[0]).toHaveProperty('id');
      expect(users[0]).toHaveProperty('name');
    });

    it('用戶列表應該包含特定用戶', async () => {
      const users = await fetchUsers();

      const alice = users.find((u) => u.name === 'Alice');
      expect(alice).toBeDefined();
      expect(alice?.id).toBe(1);
    });
  });

  describe('delay()', () => {
    it('應該等待指定時間', async () => {
      const start = Date.now();
      await delay(100);
      const elapsed = Date.now() - start;

      // 允許一些誤差
      expect(elapsed).toBeGreaterThanOrEqual(90);
      expect(elapsed).toBeLessThan(150);
    });
  });
});

// Mock 測試
describe('使用 Mock 測試', () => {
  it('應該模擬函數調用', () => {
    const mockFn = vi.fn();
    mockFn('hello');
    mockFn('world');

    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(mockFn).toHaveBeenCalledWith('hello');
    expect(mockFn).toHaveBeenCalledWith('world');
  });

  it('應該模擬返回值', () => {
    const mockFn = vi.fn();
    mockFn.mockReturnValue(42);

    expect(mockFn()).toBe(42);
  });

  it('應該模擬異步返回值', async () => {
    const mockFn = vi.fn();
    mockFn.mockResolvedValue({ id: 1, name: 'Test' });

    const result = await mockFn();
    expect(result).toEqual({ id: 1, name: 'Test' });
  });
});
