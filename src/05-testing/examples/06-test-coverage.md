# 測試覆蓋率指南

## 什麼是測試覆蓋率？

測試覆蓋率（Test Coverage）是衡量代碼被測試程度的指標，它告訴我們有多少代碼被測試用例執行過。

## 覆蓋率類型

### 1. 語句覆蓋率（Statement Coverage）
- 衡量有多少代碼語句被執行過
- 目標：通常 80% 以上

```typescript
// 示例
function divide(a: number, b: number): number {
  if (b === 0) {
    throw new Error('Division by zero');  // 需要測試這行
  }
  return a / b;  // 也需要測試這行
}

// 測試
it('should divide numbers', () => {
  expect(divide(10, 2)).toBe(5);  // 覆蓋 return 語句
});

it('should throw error on division by zero', () => {
  expect(() => divide(10, 0)).toThrow();  // 覆蓋 throw 語句
});
```

### 2. 分支覆蓋率（Branch Coverage）
- 衡量所有分支條件（if/else）是否都被測試
- 更嚴格的標準

```typescript
function checkAge(age: number): string {
  if (age < 18) {
    return 'minor';      // 分支 1
  } else if (age < 65) {
    return 'adult';      // 分支 2
  } else {
    return 'senior';     // 分支 3
  }
}

// 需要測試所有三個分支
it('should identify minor', () => {
  expect(checkAge(15)).toBe('minor');
});

it('should identify adult', () => {
  expect(checkAge(30)).toBe('adult');
});

it('should identify senior', () => {
  expect(checkAge(70)).toBe('senior');
});
```

### 3. 函數覆蓋率（Function Coverage）
- 衡量有多少函數被調用過

```typescript
class Calculator {
  add(a: number, b: number): number {
    return a + b;
  }

  subtract(a: number, b: number): number {
    return a - b;
  }

  multiply(a: number, b: number): number {
    return a * b;
  }
}

// 需要測試所有方法
describe('Calculator', () => {
  let calc: Calculator;

  beforeEach(() => {
    calc = new Calculator();
  });

  it('should add', () => {
    expect(calc.add(2, 3)).toBe(5);
  });

  it('should subtract', () => {
    expect(calc.subtract(5, 3)).toBe(2);
  });

  it('should multiply', () => {
    expect(calc.multiply(2, 3)).toBe(6);
  });
});
```

### 4. 行覆蓋率（Line Coverage）
- 衡量有多少行代碼被執行過
- 與語句覆蓋率類似

## 配置 Jest 覆蓋率

### package.json 配置

```json
{
  "scripts": {
    "test": "jest",
    "test:coverage": "jest --coverage",
    "test:watch": "jest --watch",
    "test:coverage:watch": "jest --coverage --watchAll"
  },
  "jest": {
    "collectCoverage": true,
    "coverageDirectory": "coverage",
    "coverageReporters": ["text", "lcov", "html"],
    "collectCoverageFrom": [
      "src/**/*.{ts,tsx}",
      "!src/**/*.d.ts",
      "!src/**/*.test.{ts,tsx}",
      "!src/**/__tests__/**"
    ],
    "coverageThreshold": {
      "global": {
        "branches": 80,
        "functions": 80,
        "lines": 80,
        "statements": 80
      }
    }
  }
}
```

### jest.config.js 配置

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  // 覆蓋率配置
  collectCoverage: true,
  coverageDirectory: 'coverage',

  // 報告格式
  coverageReporters: [
    'text',        // 終端輸出
    'text-summary', // 簡要摘要
    'html',        // HTML 報告
    'lcov',        // LCOV 格式（用於 CI/CD）
    'json'         // JSON 格式
  ],

  // 收集覆蓋率的文件
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    '!src/**/*.test.{js,ts}',
    '!src/**/*.spec.{js,ts}',
    '!src/**/__tests__/**',
    '!src/**/node_modules/**',
    '!src/**/dist/**'
  ],

  // 覆蓋率閾值
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    // 也可以為特定文件設置
    './src/critical/*.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },

  // 覆蓋率路徑映射
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/.*.test.ts$/'
  ]
};
```

## 運行覆蓋率測試

### 基本命令

```bash
# 運行測試並生成覆蓋率報告
npm run test:coverage

# 或使用 Jest 直接
npx jest --coverage

# 生成特定文件的覆蓋率
npx jest --coverage --collectCoverageFrom='src/utils/**/*.ts'

# 監視模式
npx jest --coverage --watchAll
```

### 查看報告

```bash
# 在瀏覽器中查看 HTML 報告
open coverage/lcov-report/index.html

# Linux
xdg-open coverage/lcov-report/index.html

# Windows
start coverage/lcov-report/index.html
```

## 覆蓋率報告解讀

### 終端輸出示例

```
------------------|---------|----------|---------|---------|-------------------
File              | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
------------------|---------|----------|---------|---------|-------------------
All files         |   85.71 |    83.33 |   88.89 |   85.71 |
 user.service.ts  |     100 |      100 |     100 |     100 |
 post.service.ts  |   83.33 |       75 |      80 |   83.33 | 45-47,89
 auth.service.ts  |   71.43 |    66.67 |   85.71 |   71.43 | 23,56-58
------------------|---------|----------|---------|---------|-------------------
```

- **% Stmts**: 語句覆蓋率
- **% Branch**: 分支覆蓋率
- **% Funcs**: 函數覆蓋率
- **% Lines**: 行覆蓋率
- **Uncovered Line #s**: 未覆蓋的行號

## 最佳實踐

### 1. 設定合理的閾值

```javascript
// 不同項目類型的建議閾值
{
  // 關鍵業務邏輯
  "src/core/**/*.ts": {
    "branches": 90,
    "functions": 90,
    "lines": 90,
    "statements": 90
  },

  // 一般業務邏輯
  "src/services/**/*.ts": {
    "branches": 80,
    "functions": 80,
    "lines": 80,
    "statements": 80
  },

  // 工具函數
  "src/utils/**/*.ts": {
    "branches": 70,
    "functions": 70,
    "lines": 70,
    "statements": 70
  }
}
```

### 2. 不要盲目追求 100% 覆蓋率

```typescript
// 有些代碼不需要測試
export class Logger {
  // 簡單的 getter/setter
  get level(): string {
    return this._level;  // 不需要特別測試
  }

  // 非常簡單的工具函數
  private formatDate(date: Date): string {
    return date.toISOString();  // 可以不測試
  }

  // 重要業務邏輯 - 必須測試
  async logError(error: Error): Promise<void> {
    // 這個需要測試
  }
}
```

### 3. 重點測試關鍵路徑

```typescript
// 優先測試這些
class PaymentService {
  // 關鍵業務邏輯 - 必須 100% 覆蓋
  async processPayment(amount: number, method: string): Promise<boolean> {
    // 所有分支都要測試
  }

  // 錯誤處理 - 必須測試
  async handlePaymentFailure(error: Error): Promise<void> {
    // 測試所有錯誤情況
  }

  // 輔助方法 - 可以較低覆蓋率
  private formatCurrency(amount: number): string {
    // 不太關鍵
  }
}
```

### 4. 測試邊界情況

```typescript
function validateAge(age: number): boolean {
  return age >= 0 && age <= 150;
}

describe('validateAge', () => {
  // 正常情況
  it('should accept valid age', () => {
    expect(validateAge(25)).toBe(true);
  });

  // 邊界情況
  it('should accept minimum age', () => {
    expect(validateAge(0)).toBe(true);
  });

  it('should accept maximum age', () => {
    expect(validateAge(150)).toBe(true);
  });

  it('should reject negative age', () => {
    expect(validateAge(-1)).toBe(false);
  });

  it('should reject age over maximum', () => {
    expect(validateAge(151)).toBe(false);
  });
});
```

### 5. 忽略不需要測試的代碼

```typescript
// 使用 istanbul 註釋忽略
/* istanbul ignore next */
function debugOnly(): void {
  console.log('Debug info');
}

/* istanbul ignore if */
if (process.env.NODE_ENV === 'development') {
  // 開發環境專用代碼
}

// 或在配置中忽略整個文件
// jest.config.js
{
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/test/',
    '/scripts/',
    '/config/'
  ]
}
```

## CI/CD 整合

### GitHub Actions 示例

```yaml
name: Tests with Coverage

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run tests with coverage
        run: npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
          fail_ci_if_error: true

      - name: Check coverage threshold
        run: |
          if [ $(cat coverage/coverage-summary.json | jq '.total.lines.pct') -lt 80 ]; then
            echo "Coverage is below 80%"
            exit 1
          fi
```

### GitLab CI 示例

```yaml
test:
  stage: test
  script:
    - npm ci
    - npm run test:coverage
  coverage: '/All files[^|]*\|[^|]*\s+([\d\.]+)/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
    paths:
      - coverage/
```

## 覆蓋率工具推薦

### 1. Codecov
- 線上覆蓋率報告
- PR 集成
- 趨勢分析

```bash
# 安裝
npm install -D codecov

# 上傳報告
npx codecov
```

### 2. Coveralls
- 類似 Codecov
- GitHub 集成好

```bash
npm install -D coveralls
cat coverage/lcov.info | coveralls
```

### 3. SonarQube
- 代碼質量分析
- 覆蓋率追蹤
- 技術債務管理

## 實用技巧

### 1. 生成徽章

```markdown
[![Coverage Status](https://codecov.io/gh/username/repo/branch/main/graph/badge.svg)](https://codecov.io/gh/username/repo)
```

### 2. 查看未覆蓋代碼

```bash
# 只顯示未覆蓋的文件
npx jest --coverage --coverageReporters=text --silent | grep -v "100"

# 生成詳細報告
npx jest --coverage --verbose
```

### 3. 監控覆蓋率變化

```json
{
  "scripts": {
    "test:coverage:diff": "jest --coverage --changedSince=main"
  }
}
```

### 4. 分析覆蓋率趨勢

```javascript
// scripts/coverage-trend.js
const fs = require('fs');
const coverage = require('../coverage/coverage-summary.json');

const trend = {
  date: new Date().toISOString(),
  coverage: coverage.total.lines.pct
};

// 保存到文件
let history = [];
if (fs.existsSync('coverage-history.json')) {
  history = require('../coverage-history.json');
}
history.push(trend);
fs.writeFileSync('coverage-history.json', JSON.stringify(history, null, 2));

console.log(`Current coverage: ${trend.coverage}%`);
```

## 常見問題

### 1. 覆蓋率突然下降？

```bash
# 檢查是否有新文件沒有測試
npx jest --coverage --verbose

# 對比上次報告
git diff coverage/coverage-summary.json
```

### 2. 異步代碼覆蓋率不准確？

```typescript
// 確保等待異步操作完成
it('should handle async', async () => {
  await service.asyncMethod();  // 使用 await
  expect(result).toBe(expected);
});
```

### 3. 覆蓋率報告文件太大？

```javascript
// 只生成需要的報告格式
{
  coverageReporters: ['text-summary', 'lcov']  // 移除 html
}
```

## 總結

### 關鍵要點

1. **合理的目標**：80-90% 是好的目標，不要盲目追求 100%
2. **關注質量**：覆蓋率高不等於測試質量好
3. **持續監控**：在 CI/CD 中集成覆蓋率檢查
4. **重點突出**：關鍵業務邏輯要求更高的覆蓋率
5. **定期審查**：定期檢查未覆蓋的代碼

### 推薦工作流程

```bash
# 開發時
npm run test:watch

# 提交前
npm run test:coverage

# CI/CD
npm run test:coverage && npm run coverage:check

# 定期審查
npm run coverage:report
```
