/**
 * 測試範例 1: 基礎單元測試
 *
 * 學習目標：
 * - 使用 Vitest 編寫測試
 * - 理解 describe, it, expect
 * - 測試純函數
 */

import { describe, it, expect } from 'vitest';

// 待測試的函數
function add(a: number, b: number): number {
  return a + b;
}

function multiply(a: number, b: number): number {
  return a * b;
}

function divide(a: number, b: number): number {
  if (b === 0) {
    throw new Error('Cannot divide by zero');
  }
  return a / b;
}

function isEven(num: number): boolean {
  return num % 2 === 0;
}

function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// 測試套件
describe('數學運算函數', () => {
  describe('add()', () => {
    it('應該正確相加兩個正數', () => {
      expect(add(2, 3)).toBe(5);
    });

    it('應該正確處理負數', () => {
      expect(add(-2, -3)).toBe(-5);
      expect(add(-2, 3)).toBe(1);
    });

    it('應該正確處理零', () => {
      expect(add(0, 5)).toBe(5);
      expect(add(5, 0)).toBe(5);
    });
  });

  describe('multiply()', () => {
    it('應該正確相乘兩個數', () => {
      expect(multiply(2, 3)).toBe(6);
      expect(multiply(-2, 3)).toBe(-6);
    });

    it('乘以零應該得到零', () => {
      expect(multiply(5, 0)).toBe(0);
    });
  });

  describe('divide()', () => {
    it('應該正確相除兩個數', () => {
      expect(divide(6, 2)).toBe(3);
      expect(divide(10, 4)).toBe(2.5);
    });

    it('除以零應該拋出錯誤', () => {
      expect(() => divide(5, 0)).toThrow('Cannot divide by zero');
    });
  });

  describe('isEven()', () => {
    it('應該正確判斷偶數', () => {
      expect(isEven(2)).toBe(true);
      expect(isEven(4)).toBe(true);
      expect(isEven(0)).toBe(true);
    });

    it('應該正確判斷奇數', () => {
      expect(isEven(1)).toBe(false);
      expect(isEven(3)).toBe(false);
      expect(isEven(-1)).toBe(false);
    });
  });
});

describe('字符串處理函數', () => {
  describe('capitalize()', () => {
    it('應該將首字母大寫', () => {
      expect(capitalize('hello')).toBe('Hello');
      expect(capitalize('world')).toBe('World');
    });

    it('應該將其他字母小寫', () => {
      expect(capitalize('HELLO')).toBe('Hello');
      expect(capitalize('HeLLo')).toBe('Hello');
    });

    it('應該處理空字符串', () => {
      expect(capitalize('')).toBe('');
    });

    it('應該處理單字符', () => {
      expect(capitalize('a')).toBe('A');
      expect(capitalize('A')).toBe('A');
    });
  });
});
