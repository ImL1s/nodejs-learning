/**
 * API 版本控制示例
 *
 * 本示例展示：
 * 1. URL 路徑版本控制 (/api/v1, /api/v2)
 * 2. Header 版本控制 (Accept: application/vnd.api.v1+json)
 * 3. 查詢參數版本控制 (?version=1)
 * 4. 版本棄用警告
 * 5. 向後兼容性處理
 * 6. 版本遷移指南
 */

import express, { Request, Response, NextFunction, Router } from 'express';

const app = express();
app.use(express.json());

// ==================== 類型定義 ====================

interface User {
  id: number;
  username: string;
  email: string;
  firstName?: string;  // v2 新增
  lastName?: string;   // v2 新增
  fullName?: string;   // v1 使用
  createdAt: Date;
}

interface Product {
  id: number;
  name: string;
  price: number;
  currency: string;    // v2 新增
  description?: string;
  inStock: boolean;    // v2 修改：v1 使用 stock (number)
}

// ==================== 模擬數據庫 ====================

const users: User[] = [
  {
    id: 1,
    username: 'john_doe',
    email: 'john@example.com',
    firstName: 'John',
    lastName: 'Doe',
    fullName: 'John Doe',
    createdAt: new Date('2024-01-01')
  },
  {
    id: 2,
    username: 'jane_smith',
    email: 'jane@example.com',
    firstName: 'Jane',
    lastName: 'Smith',
    fullName: 'Jane Smith',
    createdAt: new Date('2024-01-02')
  }
];

const products: Product[] = [
  {
    id: 1,
    name: 'Laptop',
    price: 999.99,
    currency: 'USD',
    description: 'High-performance laptop',
    inStock: true
  },
  {
    id: 2,
    name: 'Mouse',
    price: 29.99,
    currency: 'USD',
    description: 'Wireless mouse',
    inStock: false
  }
];

// ==================== 版本配置 ====================

const API_VERSIONS = {
  V1: '1',
  V2: '2',
  LATEST: '2'
};

const DEPRECATED_VERSIONS = ['1'];  // 已棄用的版本

// ==================== 工具函數 ====================

/**
 * 從 v2 用戶格式轉換為 v1 格式
 */
function transformUserV1(user: User) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    fullName: user.fullName || `${user.firstName} ${user.lastName}`,
    createdAt: user.createdAt
  };
}

/**
 * 從 v2 用戶格式轉換為 v2 格式
 */
function transformUserV2(user: User) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    createdAt: user.createdAt
  };
}

/**
 * 從 v2 產品格式轉換為 v1 格式
 */
function transformProductV1(product: Product) {
  return {
    id: product.id,
    name: product.name,
    price: product.price,
    description: product.description,
    stock: product.inStock ? 100 : 0  // v1 使用數字表示庫存
  };
}

/**
 * 從 v2 產品格式轉換為 v2 格式
 */
function transformProductV2(product: Product) {
  return {
    id: product.id,
    name: product.name,
    price: product.price,
    currency: product.currency,
    description: product.description,
    inStock: product.inStock
  };
}

// ==================== 版本檢測中間件 ====================

/**
 * 從 URL 路徑中提取版本
 */
function extractVersionFromPath(req: Request): string | null {
  const match = req.path.match(/^\/api\/v(\d+)/);
  return match ? match[1] : null;
}

/**
 * 從 Accept Header 中提取版本
 */
function extractVersionFromHeader(req: Request): string | null {
  const acceptHeader = req.headers.accept;
  if (!acceptHeader) return null;

  const match = acceptHeader.match(/application\/vnd\.api\.v(\d+)\+json/);
  return match ? match[1] : null;
}

/**
 * 從查詢參數中提取版本
 */
function extractVersionFromQuery(req: Request): string | null {
  return req.query.version as string | null;
}

/**
 * 版本檢測中間件（用於 header 和 query 版本控制）
 */
function detectVersion(req: Request, res: Response, next: NextFunction) {
  // 優先級：Header > Query > 默認
  const version = extractVersionFromHeader(req) ||
                  extractVersionFromQuery(req) ||
                  API_VERSIONS.LATEST;

  // 將版本附加到請求對象
  (req as any).apiVersion = version;

  next();
}

/**
 * 棄用警告中間件
 */
function deprecationWarning(req: Request, res: Response, next: NextFunction) {
  const version = (req as any).apiVersion || extractVersionFromPath(req);

  if (version && DEPRECATED_VERSIONS.includes(version)) {
    res.setHeader('Warning', '299 - "This API version is deprecated. Please migrate to v2."');
    res.setHeader('Deprecation', 'true');
    res.setHeader('Sunset', new Date('2025-12-31').toUTCString());
    res.setHeader('Link', '</api/v2>; rel="successor-version"');
  }

  next();
}

// ==================== API v1 路由 ====================

const v1Router = Router();

/**
 * GET /api/v1/users - 獲取用戶列表 (v1)
 */
v1Router.get('/users', (req: Request, res: Response) => {
  const transformedUsers = users.map(transformUserV1);

  res.json({
    success: true,
    data: transformedUsers
  });
});

/**
 * GET /api/v1/users/:id - 獲取單個用戶 (v1)
 */
v1Router.get('/users/:id', (req: Request, res: Response) => {
  const userId = parseInt(req.params.id);
  const user = users.find(u => u.id === userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'USER_NOT_FOUND',
        message: 'User not found'
      }
    });
  }

  res.json({
    success: true,
    data: transformUserV1(user)
  });
});

/**
 * POST /api/v1/users - 創建用戶 (v1)
 */
v1Router.post('/users', (req: Request, res: Response) => {
  const { username, email, fullName } = req.body;

  if (!username || !email || !fullName) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'username, email, and fullName are required'
      }
    });
  }

  // 將 fullName 拆分為 firstName 和 lastName
  const nameParts = fullName.split(' ');
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ');

  const newUser: User = {
    id: users.length + 1,
    username,
    email,
    firstName,
    lastName,
    fullName,
    createdAt: new Date()
  };

  users.push(newUser);

  res.status(201).json({
    success: true,
    data: transformUserV1(newUser)
  });
});

/**
 * GET /api/v1/products - 獲取產品列表 (v1)
 */
v1Router.get('/products', (req: Request, res: Response) => {
  const transformedProducts = products.map(transformProductV1);

  res.json({
    success: true,
    data: transformedProducts
  });
});

/**
 * GET /api/v1/products/:id - 獲取單個產品 (v1)
 */
v1Router.get('/products/:id', (req: Request, res: Response) => {
  const productId = parseInt(req.params.id);
  const product = products.find(p => p.id === productId);

  if (!product) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'PRODUCT_NOT_FOUND',
        message: 'Product not found'
      }
    });
  }

  res.json({
    success: true,
    data: transformProductV1(product)
  });
});

// ==================== API v2 路由 ====================

const v2Router = Router();

/**
 * GET /api/v2/users - 獲取用戶列表 (v2)
 */
v2Router.get('/users', (req: Request, res: Response) => {
  const transformedUsers = users.map(transformUserV2);

  res.json({
    success: true,
    data: transformedUsers,
    meta: {
      version: '2',
      count: transformedUsers.length
    }
  });
});

/**
 * GET /api/v2/users/:id - 獲取單個用戶 (v2)
 */
v2Router.get('/users/:id', (req: Request, res: Response) => {
  const userId = parseInt(req.params.id);
  const user = users.find(u => u.id === userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'USER_NOT_FOUND',
        message: 'User not found'
      }
    });
  }

  res.json({
    success: true,
    data: transformUserV2(user),
    meta: {
      version: '2'
    }
  });
});

/**
 * POST /api/v2/users - 創建用戶 (v2)
 */
v2Router.post('/users', (req: Request, res: Response) => {
  const { username, email, firstName, lastName } = req.body;

  if (!username || !email || !firstName || !lastName) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'username, email, firstName, and lastName are required'
      }
    });
  }

  const newUser: User = {
    id: users.length + 1,
    username,
    email,
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
    createdAt: new Date()
  };

  users.push(newUser);

  res.status(201).json({
    success: true,
    data: transformUserV2(newUser),
    meta: {
      version: '2'
    }
  });
});

/**
 * GET /api/v2/products - 獲取產品列表 (v2)
 */
v2Router.get('/products', (req: Request, res: Response) => {
  const transformedProducts = products.map(transformProductV2);

  res.json({
    success: true,
    data: transformedProducts,
    meta: {
      version: '2',
      count: transformedProducts.length
    }
  });
});

/**
 * GET /api/v2/products/:id - 獲取單個產品 (v2)
 */
v2Router.get('/products/:id', (req: Request, res: Response) => {
  const productId = parseInt(req.params.id);
  const product = products.find(p => p.id === productId);

  if (!product) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'PRODUCT_NOT_FOUND',
        message: 'Product not found'
      }
    });
  }

  res.json({
    success: true,
    data: transformProductV2(product),
    meta: {
      version: '2'
    }
  });
});

// ==================== 註冊路由 ====================

// URL 路徑版本控制
app.use('/api/v1', deprecationWarning, v1Router);
app.use('/api/v2', v2Router);

// ==================== Header/Query 版本控制路由 ====================

const dynamicRouter = Router();

dynamicRouter.use(detectVersion);
dynamicRouter.use(deprecationWarning);

/**
 * GET /api/users - 根據版本返回用戶列表
 */
dynamicRouter.get('/users', (req: Request, res: Response) => {
  const version = (req as any).apiVersion;

  if (version === '1') {
    const transformedUsers = users.map(transformUserV1);
    return res.json({
      success: true,
      data: transformedUsers
    });
  } else {
    const transformedUsers = users.map(transformUserV2);
    return res.json({
      success: true,
      data: transformedUsers,
      meta: {
        version: '2',
        count: transformedUsers.length
      }
    });
  }
});

/**
 * GET /api/products - 根據版本返回產品列表
 */
dynamicRouter.get('/products', (req: Request, res: Response) => {
  const version = (req as any).apiVersion;

  if (version === '1') {
    const transformedProducts = products.map(transformProductV1);
    return res.json({
      success: true,
      data: transformedProducts
    });
  } else {
    const transformedProducts = products.map(transformProductV2);
    return res.json({
      success: true,
      data: transformedProducts,
      meta: {
        version: '2',
        count: transformedProducts.length
      }
    });
  }
});

app.use('/api', dynamicRouter);

// ==================== 版本信息端點 ====================

/**
 * GET /api/versions - 獲取所有可用版本
 */
app.get('/api/versions', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      current: API_VERSIONS.LATEST,
      supported: ['1', '2'],
      deprecated: DEPRECATED_VERSIONS,
      versions: {
        '1': {
          status: 'deprecated',
          deprecatedAt: '2024-06-01',
          sunsetAt: '2025-12-31',
          documentation: '/docs/v1',
          migrationGuide: '/docs/migration-v1-to-v2'
        },
        '2': {
          status: 'current',
          releasedAt: '2024-06-01',
          documentation: '/docs/v2'
        }
      }
    }
  });
});

/**
 * GET /api/migration-guide - 版本遷移指南
 */
app.get('/api/migration-guide', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      from: 'v1',
      to: 'v2',
      breaking_changes: [
        {
          endpoint: 'POST /users',
          change: 'fullName field replaced with firstName and lastName',
          before: {
            username: 'john_doe',
            email: 'john@example.com',
            fullName: 'John Doe'
          },
          after: {
            username: 'john_doe',
            email: 'john@example.com',
            firstName: 'John',
            lastName: 'Doe'
          }
        },
        {
          endpoint: 'GET /products',
          change: 'stock field (number) replaced with inStock (boolean)',
          before: {
            id: 1,
            name: 'Product',
            price: 99.99,
            stock: 100
          },
          after: {
            id: 1,
            name: 'Product',
            price: 99.99,
            currency: 'USD',
            inStock: true
          }
        }
      ],
      new_features: [
        'Added currency field to products',
        'Enhanced error messages',
        'Added meta information in responses'
      ],
      migration_steps: [
        '1. Update client to use firstName and lastName instead of fullName',
        '2. Handle inStock boolean instead of stock number',
        '3. Update Accept header or URL path to use v2',
        '4. Test all endpoints thoroughly',
        '5. Monitor for any issues'
      ]
    }
  });
});

// ==================== 錯誤處理 ====================

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found'
    }
  });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    }
  });
});

// ==================== 啟動服務器 ====================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('\n=== API Versioning Example ===');
  console.log('\n1. URL Path Versioning:');
  console.log('  GET /api/v1/users - v1 用戶列表');
  console.log('  GET /api/v2/users - v2 用戶列表');
  console.log('  GET /api/v1/products - v1 產品列表');
  console.log('  GET /api/v2/products - v2 產品列表');
  console.log('\n2. Header Versioning:');
  console.log('  GET /api/users -H "Accept: application/vnd.api.v1+json"');
  console.log('  GET /api/users -H "Accept: application/vnd.api.v2+json"');
  console.log('\n3. Query Parameter Versioning:');
  console.log('  GET /api/users?version=1');
  console.log('  GET /api/users?version=2');
  console.log('\n4. Version Information:');
  console.log('  GET /api/versions - 查看所有版本信息');
  console.log('  GET /api/migration-guide - 查看遷移指南');
  console.log('\nExample usage:');
  console.log('  # URL path versioning');
  console.log('  curl http://localhost:3000/api/v1/users');
  console.log('  curl http://localhost:3000/api/v2/users');
  console.log('\n  # Header versioning');
  console.log('  curl http://localhost:3000/api/users -H "Accept: application/vnd.api.v1+json"');
  console.log('  curl http://localhost:3000/api/users -H "Accept: application/vnd.api.v2+json"');
  console.log('\n  # Query parameter versioning');
  console.log('  curl "http://localhost:3000/api/users?version=1"');
  console.log('  curl "http://localhost:3000/api/users?version=2"');
});

export default app;
