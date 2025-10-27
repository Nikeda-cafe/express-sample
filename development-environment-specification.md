# Express + TypeScript 開発環境 構築仕様書

## 1. 概要

本仕様書は、Docker を使用した Express + TypeScript ベースの Web アプリケーション開発環境の構築手順と設定を定義します。

### 1.1 技術スタック

- **コンテナ環境**: Docker, Docker Compose
- **ランタイム**: Node.js 20.x
- **フレームワーク**: Express.js
- **言語**: TypeScript
- **テンプレートエンジン**: EJS
- **ORM**: Prisma
- **スタイリング**: CSS Modules
- **データベース**: MySQL 8.0
- **テスト**: Jest
- **リンター**: ESLint
- **開発OS**: macOS (Apple Silicon M3)

---

## 2. ディレクトリ構成

```
project-root/
├── docker/
│   ├── app/
│   │   └── Dockerfile
│   └── mysql/
│       └── my.cnf
├── src/
│   ├── controllers/          # コントローラー層（リクエスト/レスポンス処理）
│   │   ├── user.controller.ts
│   │   └── post.controller.ts
│   ├── services/             # サービス層（ビジネスロジック）
│   │   ├── user.service.ts
│   │   └── post.service.ts
│   ├── repositories/         # リポジトリ層（データアクセス）
│   │   ├── user.repository.ts
│   │   └── post.repository.ts
│   ├── routes/               # ルーティング定義
│   │   ├── index.ts
│   │   ├── user.routes.ts
│   │   └── post.routes.ts
│   ├── views/                # EJSテンプレート
│   │   ├── layouts/
│   │   │   └── main.ejs
│   │   ├── users/
│   │   │   ├── index.ejs
│   │   │   └── show.ejs
│   │   ├── posts/
│   │   │   ├── index.ejs
│   │   │   └── show.ejs
│   │   ├── index.ejs
│   │   └── error.ejs
│   ├── styles/               # CSS Modules
│   │   └── *.module.css
│   ├── middleware/           # ミドルウェア
│   │   ├── error.middleware.ts
│   │   └── validation.middleware.ts
│   ├── types/                # 型定義
│   │   ├── css-modules.d.ts
│   │   └── custom.d.ts
│   ├── utils/                # ユーティリティ関数
│   │   └── logger.ts
│   ├── config/               # 設定ファイル
│   │   └── database.ts
│   ├── app.ts               # Expressアプリケーション設定
│   └── server.ts            # サーバー起動
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── tests/
│   ├── unit/
│   │   ├── services/
│   │   ├── repositories/
│   │   └── controllers/
│   └── integration/
│       └── api/
├── public/
│   ├── css/
│   ├── js/
│   └── images/
├── docker-compose.yml
├── .dockerignore
├── .gitignore
├── package.json
├── tsconfig.json
├── jest.config.js
├── .eslintrc.js
└── README.md
```

### 2.1 アーキテクチャ概要

本プロジェクトは、関心の分離を実現する3層アーキテクチャを採用しています。

```
┌─────────────────────────────────────────┐
│          クライアント（ブラウザ）          │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         Controller層（コントローラー）      │
│  - HTTPリクエスト/レスポンスの処理          │
│  - バリデーション                          │
│  - ビュー（EJS）へのデータ渡し              │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│           Service層（サービス）            │
│  - ビジネスロジックの実装                   │
│  - トランザクション管理                     │
│  - 複数リポジトリの組み合わせ               │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│        Repository層（リポジトリ）          │
│  - データアクセスロジック                   │
│  - Prismaクライアントの操作                │
│  - CRUDメソッドの実装                      │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         Database（MySQL）                │
└─────────────────────────────────────────┘
```

---

## 3. Docker 設定

### 3.1 docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: ./docker/app/Dockerfile
    container_name: express-app
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
      - DATABASE_URL=mysql://appuser:apppassword@db:3306/appdb
    depends_on:
      db:
        condition: service_healthy
    command: npm run dev
    networks:
      - app-network

  db:
    image: mysql:8.0
    platform: linux/amd64  # M3 Mac用の設定
    container_name: mysql-db
    ports:
      - "3306:3306"
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: appdb
      MYSQL_USER: appuser
      MYSQL_PASSWORD: apppassword
    volumes:
      - mysql-data:/var/lib/mysql
      - ./docker/mysql/my.cnf:/etc/mysql/conf.d/my.cnf
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-prootpassword"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - app-network

volumes:
  mysql-data:

networks:
  app-network:
    driver: bridge
```

### 3.2 docker/app/Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

# タイムゾーン設定
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/Asia/Tokyo /etc/localtime && \
    echo "Asia/Tokyo" > /etc/timezone

# Python と build tools のインストール (Prisma用)
RUN apk add --no-cache python3 make g++ openssl

# package.json と package-lock.json をコピー
COPY package*.json ./

# 依存関係のインストール
RUN npm ci

# アプリケーションファイルをコピー
COPY . .

# Prismaクライアントの生成
RUN npx prisma generate

# ポート公開
EXPOSE 3000

# 開発サーバー起動
CMD ["npm", "run", "dev"]
```

### 3.3 docker/mysql/my.cnf

```ini
[mysqld]
character-set-server=utf8mb4
collation-server=utf8mb4_unicode_ci
default-time-zone='Asia/Tokyo'

[client]
default-character-set=utf8mb4
```

### 3.4 .dockerignore

```
node_modules
npm-debug.log
dist
.git
.gitignore
README.md
.env
.env.local
coverage
.DS_Store
```

---

## 4. Node.js / TypeScript 設定

### 4.1 package.json

```json
{
  "name": "express-typescript-app",
  "version": "1.0.0",
  "description": "Express + TypeScript application with Prisma",
  "main": "dist/server.js",
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only --poll src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint . --ext .ts",
    "lint:fix": "eslint . --ext .ts --fix",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:seed": "ts-node prisma/seed.ts",
    "prisma:studio": "prisma studio"
  },
  "dependencies": {
    "@prisma/client": "^5.7.0",
    "express": "^4.18.2",
    "ejs": "^3.1.9",
    "dotenv": "^16.3.1",
    "express-ejs-layouts": "^2.5.1",
    "typed-css-modules": "^0.7.2"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.0",
    "@types/jest": "^29.5.10",
    "@types/ejs": "^3.1.5",
    "@typescript-eslint/eslint-plugin": "^6.13.0",
    "@typescript-eslint/parser": "^6.13.0",
    "eslint": "^8.54.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.1",
    "ts-node": "^10.9.2",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.3.2",
    "prisma": "^5.7.0"
  }
}
```

### 4.2 tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "removeComments": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@controllers/*": ["src/controllers/*"],
      "@services/*": ["src/services/*"],
      "@repositories/*": ["src/repositories/*"],
      "@routes/*": ["src/routes/*"],
      "@middleware/*": ["src/middleware/*"],
      "@utils/*": ["src/utils/*"],
      "@types/*": ["src/types/*"],
      "@config/*": ["src/config/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

---

## 5. Prisma 設定

### 5.1 prisma/schema.prisma

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  posts     Post[]

  @@map("users")
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  content   String?  @db.Text
  published Boolean  @default(false)
  authorId  Int
  author    User     @relation(fields: [authorId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("posts")
}
```

### 5.2 prisma/seed.ts

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // ユーザーの作成
  const user1 = await prisma.user.create({
    data: {
      email: 'user1@example.com',
      name: 'User One',
    },
  });

  const user2 = await prisma.user.create({
    data: {
      email: 'user2@example.com',
      name: 'User Two',
    },
  });

  // 投稿の作成
  await prisma.post.create({
    data: {
      title: 'First Post',
      content: 'This is the first post',
      published: true,
      authorId: user1.id,
    },
  });

  await prisma.post.create({
    data: {
      title: 'Second Post',
      content: 'This is the second post',
      published: false,
      authorId: user2.id,
    },
  });

  console.log('Seed data created successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

---

## 6. Express アプリケーション設定

### 6.1 src/app.ts

```typescript
import express, { Application, Request, Response, NextFunction } from 'express';
import path from 'path';
import expressLayouts from 'express-ejs-layouts';
import routes from './routes';
import { errorHandler } from './middleware/error.middleware';

const app: Application = express();

// ビューエンジンの設定
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// ミドルウェア
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// CSS Modules のスタイルを提供
app.use('/styles', express.static(path.join(__dirname, 'styles')));

// ルート
app.use('/', routes);

// 404エラーハンドリング
app.use((req: Request, res: Response) => {
  res.status(404).render('error', { 
    title: '404 Not Found',
    message: 'Page not found' 
  });
});

// エラーハンドリングミドルウェア
app.use(errorHandler);

export default app;
```

### 6.2 src/server.ts

```typescript
import app from './app';
import { PrismaClient } from '@prisma/client';

const PORT = process.env.PORT || 3000;
const prisma = new PrismaClient();

// データベース接続テスト
async function startServer() {
  try {
    await prisma.$connect();
    console.log('Database connected successfully');
    
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to connect to database:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await prisma.$disconnect();
  process.exit(0);
});
```

### 6.3 src/config/database.ts

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export default prisma;
```

---

## 7. 3層アーキテクチャの実装

### 7.1 Repository層（リポジトリ）

データアクセスロジックを担当します。

#### src/repositories/user.repository.ts

```typescript
import prisma from '../config/database';
import { User, Prisma } from '@prisma/client';

export class UserRepository {
  async findAll(): Promise<User[]> {
    return await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: number): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { id },
      include: { posts: true },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { email },
    });
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return await prisma.user.create({
      data,
    });
  }

  async update(id: number, data: Prisma.UserUpdateInput): Promise<User> {
    return await prisma.user.update({
      where: { id },
      data,
    });
  }

  async delete(id: number): Promise<User> {
    return await prisma.user.delete({
      where: { id },
    });
  }

  async count(): Promise<number> {
    return await prisma.user.count();
  }
}

export default new UserRepository();
```

#### src/repositories/post.repository.ts

```typescript
import prisma from '../config/database';
import { Post, Prisma } from '@prisma/client';

export class PostRepository {
  async findAll(published?: boolean): Promise<Post[]> {
    return await prisma.post.findMany({
      where: published !== undefined ? { published } : undefined,
      include: { author: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: number): Promise<Post | null> {
    return await prisma.post.findUnique({
      where: { id },
      include: { author: true },
    });
  }

  async findByAuthorId(authorId: number): Promise<Post[]> {
    return await prisma.post.findMany({
      where: { authorId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: Prisma.PostCreateInput): Promise<Post> {
    return await prisma.post.create({
      data,
      include: { author: true },
    });
  }

  async update(id: number, data: Prisma.PostUpdateInput): Promise<Post> {
    return await prisma.post.update({
      where: { id },
      data,
      include: { author: true },
    });
  }

  async delete(id: number): Promise<Post> {
    return await prisma.post.delete({
      where: { id },
    });
  }

  async publish(id: number): Promise<Post> {
    return await prisma.post.update({
      where: { id },
      data: { published: true },
    });
  }
}

export default new PostRepository();
```

### 7.2 Service層（サービス）

ビジネスロジックを担当します。

#### src/services/user.service.ts

```typescript
import userRepository, { UserRepository } from '../repositories/user.repository';
import postRepository from '../repositories/post.repository';
import { User, Prisma } from '@prisma/client';

export class UserService {
  constructor(private userRepo: UserRepository = userRepository) {}

  async getAllUsers(): Promise<User[]> {
    return await this.userRepo.findAll();
  }

  async getUserById(id: number): Promise<User | null> {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  async createUser(data: { email: string; name?: string }): Promise<User> {
    // メールアドレスの重複チェック
    const existingUser = await this.userRepo.findByEmail(data.email);
    if (existingUser) {
      throw new Error('Email already exists');
    }

    // バリデーション
    if (!this.isValidEmail(data.email)) {
      throw new Error('Invalid email format');
    }

    return await this.userRepo.create(data);
  }

  async updateUser(id: number, data: { email?: string; name?: string }): Promise<User> {
    // ユーザーの存在確認
    const existingUser = await this.userRepo.findById(id);
    if (!existingUser) {
      throw new Error('User not found');
    }

    // メールアドレスが変更される場合、重複チェック
    if (data.email && data.email !== existingUser.email) {
      const emailExists = await this.userRepo.findByEmail(data.email);
      if (emailExists) {
        throw new Error('Email already exists');
      }

      if (!this.isValidEmail(data.email)) {
        throw new Error('Invalid email format');
      }
    }

    return await this.userRepo.update(id, data);
  }

  async deleteUser(id: number): Promise<User> {
    // ユーザーの存在確認
    const existingUser = await this.userRepo.findById(id);
    if (!existingUser) {
      throw new Error('User not found');
    }

    // 関連する投稿の削除（カスケード削除のロジック）
    const posts = await postRepository.findByAuthorId(id);
    for (const post of posts) {
      await postRepository.delete(post.id);
    }

    return await this.userRepo.delete(id);
  }

  async getUserStats(id: number): Promise<{ user: User; postCount: number; publishedCount: number }> {
    const user = await this.getUserById(id);
    const posts = await postRepository.findByAuthorId(id);
    const publishedCount = posts.filter(post => post.published).length;

    return {
      user,
      postCount: posts.length,
      publishedCount,
    };
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

export default new UserService();
```

#### src/services/post.service.ts

```typescript
import postRepository, { PostRepository } from '../repositories/post.repository';
import userRepository from '../repositories/user.repository';
import { Post, Prisma } from '@prisma/client';

export class PostService {
  constructor(private postRepo: PostRepository = postRepository) {}

  async getAllPosts(publishedOnly: boolean = false): Promise<Post[]> {
    return await this.postRepo.findAll(publishedOnly ? true : undefined);
  }

  async getPostById(id: number): Promise<Post | null> {
    const post = await this.postRepo.findById(id);
    if (!post) {
      throw new Error('Post not found');
    }
    return post;
  }

  async getPostsByAuthor(authorId: number): Promise<Post[]> {
    // 著者の存在確認
    const author = await userRepository.findById(authorId);
    if (!author) {
      throw new Error('Author not found');
    }

    return await this.postRepo.findByAuthorId(authorId);
  }

  async createPost(data: { 
    title: string; 
    content?: string; 
    authorId: number;
    published?: boolean;
  }): Promise<Post> {
    // 著者の存在確認
    const author = await userRepository.findById(data.authorId);
    if (!author) {
      throw new Error('Author not found');
    }

    // バリデーション
    if (!data.title || data.title.trim().length === 0) {
      throw new Error('Title is required');
    }

    if (data.title.length > 200) {
      throw new Error('Title is too long (max 200 characters)');
    }

    return await this.postRepo.create({
      title: data.title,
      content: data.content,
      published: data.published || false,
      author: {
        connect: { id: data.authorId },
      },
    });
  }

  async updatePost(id: number, data: { 
    title?: string; 
    content?: string;
    published?: boolean;
  }): Promise<Post> {
    // 投稿の存在確認
    const existingPost = await this.postRepo.findById(id);
    if (!existingPost) {
      throw new Error('Post not found');
    }

    // バリデーション
    if (data.title !== undefined) {
      if (!data.title || data.title.trim().length === 0) {
        throw new Error('Title is required');
      }
      if (data.title.length > 200) {
        throw new Error('Title is too long (max 200 characters)');
      }
    }

    return await this.postRepo.update(id, data);
  }

  async deletePost(id: number): Promise<Post> {
    // 投稿の存在確認
    const existingPost = await this.postRepo.findById(id);
    if (!existingPost) {
      throw new Error('Post not found');
    }

    return await this.postRepo.delete(id);
  }

  async publishPost(id: number): Promise<Post> {
    // 投稿の存在確認
    const existingPost = await this.postRepo.findById(id);
    if (!existingPost) {
      throw new Error('Post not found');
    }

    if (existingPost.published) {
      throw new Error('Post is already published');
    }

    return await this.postRepo.publish(id);
  }
}

export default new PostService();
```

### 7.3 Controller層（コントローラー）

HTTPリクエスト/レスポンスを担当します。

#### src/controllers/user.controller.ts

```typescript
import { Request, Response, NextFunction } from 'express';
import userService, { UserService } from '../services/user.service';

export class UserController {
  constructor(private userService: UserService = userService) {}

  // GET /users - ユーザー一覧表示
  async index(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await this.userService.getAllUsers();
      res.render('users/index', { 
        title: 'Users',
        users 
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /users/:id - ユーザー詳細表示
  async show(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const stats = await this.userService.getUserStats(id);
      
      res.render('users/show', { 
        title: `User: ${stats.user.name || stats.user.email}`,
        user: stats.user,
        postCount: stats.postCount,
        publishedCount: stats.publishedCount
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /users/new - ユーザー作成フォーム表示
  async new(req: Request, res: Response): Promise<void> {
    res.render('users/new', { 
      title: 'Create User',
      errors: []
    });
  }

  // POST /users - ユーザー作成
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, name } = req.body;
      await this.userService.createUser({ email, name });
      res.redirect('/users');
    } catch (error) {
      next(error);
    }
  }

  // GET /users/:id/edit - ユーザー編集フォーム表示
  async edit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const user = await this.userService.getUserById(id);
      
      res.render('users/edit', { 
        title: 'Edit User',
        user,
        errors: []
      });
    } catch (error) {
      next(error);
    }
  }

  // PUT /users/:id - ユーザー更新
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const { email, name } = req.body;
      await this.userService.updateUser(id, { email, name });
      res.redirect(`/users/${id}`);
    } catch (error) {
      next(error);
    }
  }

  // DELETE /users/:id - ユーザー削除
  async destroy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      await this.userService.deleteUser(id);
      res.redirect('/users');
    } catch (error) {
      next(error);
    }
  }
}

export default new UserController();
```

#### src/controllers/post.controller.ts

```typescript
import { Request, Response, NextFunction } from 'express';
import postService, { PostService } from '../services/post.service';

export class PostController {
  constructor(private postService: PostService = postService) {}

  // GET /posts - 投稿一覧表示
  async index(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const publishedOnly = req.query.published === 'true';
      const posts = await this.postService.getAllPosts(publishedOnly);
      
      res.render('posts/index', { 
        title: 'Posts',
        posts,
        publishedOnly
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /posts/:id - 投稿詳細表示
  async show(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const post = await this.postService.getPostById(id);
      
      res.render('posts/show', { 
        title: post.title,
        post
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /posts/new - 投稿作成フォーム表示
  async new(req: Request, res: Response): Promise<void> {
    res.render('posts/new', { 
      title: 'Create Post',
      errors: []
    });
  }

  // POST /posts - 投稿作成
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { title, content, authorId, published } = req.body;
      const post = await this.postService.createPost({
        title,
        content,
        authorId: parseInt(authorId),
        published: published === 'true'
      });
      res.redirect(`/posts/${post.id}`);
    } catch (error) {
      next(error);
    }
  }

  // GET /posts/:id/edit - 投稿編集フォーム表示
  async edit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const post = await this.postService.getPostById(id);
      
      res.render('posts/edit', { 
        title: 'Edit Post',
        post,
        errors: []
      });
    } catch (error) {
      next(error);
    }
  }

  // PUT /posts/:id - 投稿更新
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const { title, content, published } = req.body;
      await this.postService.updatePost(id, {
        title,
        content,
        published: published === 'true'
      });
      res.redirect(`/posts/${id}`);
    } catch (error) {
      next(error);
    }
  }

  // DELETE /posts/:id - 投稿削除
  async destroy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      await this.postService.deletePost(id);
      res.redirect('/posts');
    } catch (error) {
      next(error);
    }
  }

  // POST /posts/:id/publish - 投稿を公開
  async publish(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      await this.postService.publishPost(id);
      res.redirect(`/posts/${id}`);
    } catch (error) {
      next(error);
    }
  }
}

export default new PostController();
```

### 7.4 Routes（ルーティング）

#### src/routes/index.ts

```typescript
import { Router, Request, Response } from 'express';
import userRoutes from './user.routes';
import postRoutes from './post.routes';

const router = Router();

// トップページ
router.get('/', (req: Request, res: Response) => {
  res.render('index', { title: 'Home' });
});

// 各リソースのルーティング
router.use('/users', userRoutes);
router.use('/posts', postRoutes);

export default router;
```

#### src/routes/user.routes.ts

```typescript
import { Router } from 'express';
import userController from '../controllers/user.controller';

const router = Router();

// ユーザー一覧
router.get('/', (req, res, next) => userController.index(req, res, next));

// ユーザー作成フォーム
router.get('/new', (req, res, next) => userController.new(req, res));

// ユーザー作成
router.post('/', (req, res, next) => userController.create(req, res, next));

// ユーザー詳細
router.get('/:id', (req, res, next) => userController.show(req, res, next));

// ユーザー編集フォーム
router.get('/:id/edit', (req, res, next) => userController.edit(req, res, next));

// ユーザー更新
router.post('/:id', (req, res, next) => userController.update(req, res, next));

// ユーザー削除
router.post('/:id/delete', (req, res, next) => userController.destroy(req, res, next));

export default router;
```

#### src/routes/post.routes.ts

```typescript
import { Router } from 'express';
import postController from '../controllers/post.controller';

const router = Router();

// 投稿一覧
router.get('/', (req, res, next) => postController.index(req, res, next));

// 投稿作成フォーム
router.get('/new', (req, res) => postController.new(req, res));

// 投稿作成
router.post('/', (req, res, next) => postController.create(req, res, next));

// 投稿詳細
router.get('/:id', (req, res, next) => postController.show(req, res, next));

// 投稿編集フォーム
router.get('/:id/edit', (req, res, next) => postController.edit(req, res, next));

// 投稿更新
router.post('/:id', (req, res, next) => postController.update(req, res, next));

// 投稿削除
router.post('/:id/delete', (req, res, next) => postController.destroy(req, res, next));

// 投稿公開
router.post('/:id/publish', (req, res, next) => postController.publish(req, res, next));

export default router;
```

### 7.5 Middleware（ミドルウェア）

#### src/middleware/error.middleware.ts

```typescript
import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error:', err);

  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message = err.message || 'Internal Server Error';

  if (req.accepts('html')) {
    res.status(statusCode).render('error', {
      title: 'Error',
      message,
      statusCode,
      error: process.env.NODE_ENV === 'development' ? err : {}
    });
  } else {
    res.status(statusCode).json({
      status: 'error',
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  }
};
```

---

## 8. CSS Modules 設定

### 8.1 src/types/css-modules.d.ts

```typescript
declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}
```

### 8.2 src/styles/example.module.css

```css
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.title {
  font-size: 2rem;
  color: #333;
  margin-bottom: 1rem;
}

.button {
  background-color: #007bff;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.button:hover {
  background-color: #0056b3;
}
```

### 8.3 CSS Modules の使用方法

TypeScript ファイルで CSS Modules をインポート:

```typescript
import styles from '../styles/example.module.css';

// EJS に渡す
res.render('index', { 
  title: 'Home',
  styles: styles 
});
```

EJS テンプレートで使用:

```html
<div class="<%= styles.container %>">
  <h1 class="<%= styles.title %>">Welcome</h1>
  <button class="<%= styles.button %>">Click me</button>
</div>
```

---

## 9. テスト設定 (Jest)

### 9.1 jest.config.js

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/server.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@controllers/(.*)$': '<rootDir>/src/controllers/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@repositories/(.*)$': '<rootDir>/src/repositories/$1',
    '^@routes/(.*)$': '<rootDir>/src/routes/$1',
    '^@middleware/(.*)$': '<rootDir>/src/middleware/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
  },
};
```

### 9.2 tests/unit/repositories/user.repository.test.ts

```typescript
import { UserRepository } from '../../../src/repositories/user.repository';
import prisma from '../../../src/config/database';

// Prismaのモック
jest.mock('../../../src/config/database', () => ({
  __esModule: true,
  default: {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  },
}));

describe('UserRepository', () => {
  let userRepository: UserRepository;

  beforeEach(() => {
    userRepository = new UserRepository();
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      const mockUsers = [
        { id: 1, email: 'user1@example.com', name: 'User 1', createdAt: new Date(), updatedAt: new Date() },
        { id: 2, email: 'user2@example.com', name: 'User 2', createdAt: new Date(), updatedAt: new Date() },
      ];

      (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);

      const result = await userRepository.findAll();

      expect(result).toEqual(mockUsers);
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findById', () => {
    it('should return a user by id', async () => {
      const mockUser = { 
        id: 1, 
        email: 'user1@example.com', 
        name: 'User 1', 
        posts: [],
        createdAt: new Date(), 
        updatedAt: new Date() 
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await userRepository.findById(1);

      expect(result).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: { posts: true },
      });
    });
  });
});
```

### 9.3 tests/unit/services/user.service.test.ts

```typescript
import { UserService } from '../../../src/services/user.service';
import { UserRepository } from '../../../src/repositories/user.repository';

describe('UserService', () => {
  let userService: UserService;
  let mockUserRepository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    mockUserRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    } as any;

    userService = new UserService(mockUserRepository);
  });

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      const userData = { email: 'test@example.com', name: 'Test User' };
      const mockUser = { id: 1, ...userData, createdAt: new Date(), updatedAt: new Date() };

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(mockUser);

      const result = await userService.createUser(userData);

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(userData.email);
      expect(mockUserRepository.create).toHaveBeenCalledWith(userData);
    });

    it('should throw error if email already exists', async () => {
      const userData = { email: 'existing@example.com', name: 'Test User' };
      const existingUser = { id: 1, ...userData, createdAt: new Date(), updatedAt: new Date() };

      mockUserRepository.findByEmail.mockResolvedValue(existingUser);

      await expect(userService.createUser(userData)).rejects.toThrow('Email already exists');
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error if email format is invalid', async () => {
      const userData = { email: 'invalid-email', name: 'Test User' };

      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(userService.createUser(userData)).rejects.toThrow('Invalid email format');
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('getUserById', () => {
    it('should return user if found', async () => {
      const mockUser = { 
        id: 1, 
        email: 'test@example.com', 
        name: 'Test User',
        posts: [],
        createdAt: new Date(), 
        updatedAt: new Date() 
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await userService.getUserById(1);

      expect(result).toEqual(mockUser);
    });

    it('should throw error if user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(userService.getUserById(999)).rejects.toThrow('User not found');
    });
  });
});
```

### 9.4 tests/unit/controllers/user.controller.test.ts

```typescript
import { Request, Response, NextFunction } from 'express';
import { UserController } from '../../../src/controllers/user.controller';
import { UserService } from '../../../src/services/user.service';

describe('UserController', () => {
  let userController: UserController;
  let mockUserService: jest.Mocked<UserService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockUserService = {
      getAllUsers: jest.fn(),
      getUserById: jest.fn(),
      createUser: jest.fn(),
      updateUser: jest.fn(),
      deleteUser: jest.fn(),
      getUserStats: jest.fn(),
    } as any;

    userController = new UserController(mockUserService);

    mockRequest = {
      params: {},
      body: {},
      query: {},
    };

    mockResponse = {
      render: jest.fn(),
      redirect: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockNext = jest.fn();
  });

  describe('index', () => {
    it('should render users index page with all users', async () => {
      const mockUsers = [
        { id: 1, email: 'user1@example.com', name: 'User 1', createdAt: new Date(), updatedAt: new Date() },
        { id: 2, email: 'user2@example.com', name: 'User 2', createdAt: new Date(), updatedAt: new Date() },
      ];

      mockUserService.getAllUsers.mockResolvedValue(mockUsers);

      await userController.index(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockUserService.getAllUsers).toHaveBeenCalled();
      expect(mockResponse.render).toHaveBeenCalledWith('users/index', {
        title: 'Users',
        users: mockUsers,
      });
    });

    it('should call next with error if service throws', async () => {
      const error = new Error('Database error');
      mockUserService.getAllUsers.mockRejectedValue(error);

      await userController.index(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('create', () => {
    it('should create user and redirect to users list', async () => {
      mockRequest.body = { email: 'new@example.com', name: 'New User' };
      const mockUser = { id: 1, ...mockRequest.body, createdAt: new Date(), updatedAt: new Date() };

      mockUserService.createUser.mockResolvedValue(mockUser);

      await userController.create(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockUserService.createUser).toHaveBeenCalledWith(mockRequest.body);
      expect(mockResponse.redirect).toHaveBeenCalledWith('/users');
    });
  });
});
```

### 9.5 tests/integration/api/users.test.ts

```typescript
import request from 'supertest';
import app from '../../../src/app';
import prisma from '../../../src/config/database';

describe('User API Integration Tests', () => {
  beforeAll(async () => {
    // テストデータのクリーンアップ
    await prisma.post.deleteMany({});
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('GET /users', () => {
    it('should return users page', async () => {
      const response = await request(app)
        .get('/users')
        .expect(200);

      expect(response.text).toContain('Users');
    });
  });

  describe('POST /users', () => {
    it('should create a new user', async () => {
      const userData = {
        email: 'integration@example.com',
        name: 'Integration Test User',
      };

      const response = await request(app)
        .post('/users')
        .send(userData)
        .expect(302); // Redirect

      expect(response.header.location).toBe('/users');

      // ユーザーが実際に作成されたか確認
      const createdUser = await prisma.user.findUnique({
        where: { email: userData.email },
      });

      expect(createdUser).toBeTruthy();
      expect(createdUser?.name).toBe(userData.name);
    });
  });
});
```

**注意**: 統合テストを実行するには、`supertest` パッケージをインストールする必要があります:
```bash
npm install -D supertest @types/supertest
```

---

## 10. ESLint 設定

### 10.1 .eslintrc.js

```javascript
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { 
      argsIgnorePattern: '^_' 
    }],
    'no-console': 'off',
  },
  env: {
    node: true,
    es2022: true,
    jest: true,
  },
  ignorePatterns: ['dist/', 'node_modules/', 'coverage/'],
};
```

---

## 11. 環境構築手順

### 11.1 初期セットアップ

```bash
# 1. プロジェクトディレクトリの作成
mkdir express-typescript-app
cd express-typescript-app

# 2. 必要なディレクトリの作成
mkdir -p docker/app docker/mysql src/{controllers,services,repositories,routes,views/layouts,views/users,views/posts,styles,middleware,types,utils,config} prisma tests/{unit/{controllers,services,repositories},integration/api} public/{css,js,images}

# 3. package.json の作成
npm init -y

# 4. 依存関係のインストール
npm install express ejs dotenv express-ejs-layouts @prisma/client
npm install -D typescript @types/node @types/express @types/ejs ts-node ts-node-dev @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint jest @types/jest ts-jest prisma typed-css-modules

# 5. TypeScript 設定ファイルの生成
npx tsc --init

# 6. Prisma の初期化
npx prisma init

# 7. 設定ファイルの作成
# 上記の各設定ファイルを作成
```

### 11.2 Docker コンテナの起動

```bash
# コンテナのビルドと起動
docker-compose up -d

# ログの確認
docker-compose logs -f

# コンテナの停止
docker-compose down

# ボリュームも含めて削除
docker-compose down -v
```

### 11.3 データベースのマイグレーション

```bash
# コンテナ内でマイグレーション実行
docker-compose exec app npm run prisma:migrate

# シードデータの投入
docker-compose exec app npm run prisma:seed

# Prisma Studio の起動
docker-compose exec app npm run prisma:studio
```

---

## 12. 開発ワークフロー

### 12.1 開発サーバーの起動

```bash
# Docker で開発サーバーを起動
docker-compose up

# アプリケーションへのアクセス
# http://localhost:3000
```

### 12.2 テストの実行

```bash
# 全テストを実行
docker-compose exec app npm test

# Watch モードでテスト
docker-compose exec app npm run test:watch

# カバレッジ付きでテスト
docker-compose exec app npm run test:coverage
```

### 12.3 リンターの実行

```bash
# ESLint の実行
docker-compose exec app npm run lint

# 自動修正
docker-compose exec app npm run lint:fix
```

### 12.4 ビルド

```bash
# プロダクションビルド
docker-compose exec app npm run build

# ビルドしたアプリケーションの起動
docker-compose exec app npm start
```

---

## 13. 本番環境への展開

### 13.1 本番用 Dockerfile

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache openssl

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["npm", "start"]
```

### 13.2 環境変数

本番環境では以下の環境変数を設定:

```
NODE_ENV=production
DATABASE_URL=mysql://user:password@host:3306/database
PORT=3000
```

---

## 14. トラブルシューティング

### 14.1 M3 Mac での MySQL 起動問題

`platform: linux/amd64` を docker-compose.yml に追加することで解決します。

### 14.2 Prisma のマイグレーションエラー

```bash
# Prisma クライアントの再生成
docker-compose exec app npx prisma generate

# マイグレーションのリセット
docker-compose exec app npx prisma migrate reset
```

### 14.3 ポート競合

ポート 3000 または 3306 が使用中の場合、docker-compose.yml のポート設定を変更してください。

---

## 15. 参考リソース

- [Express.js 公式ドキュメント](https://expressjs.com/)
- [TypeScript 公式ドキュメント](https://www.typescriptlang.org/)
- [Prisma 公式ドキュメント](https://www.prisma.io/docs)
- [Jest 公式ドキュメント](https://jestjs.io/)
- [Docker 公式ドキュメント](https://docs.docker.com/)

---

## 16. まとめ

本仕様書に従うことで、Mac M3 環境でも動作する Express + TypeScript ベースの開発環境を Docker を使用して構築できます。

### 主な特徴

- **3層アーキテクチャ**: Controller、Service、Repository の関心の分離により、保守性の高いコードを実現
- **型安全性**: TypeScript による静的型チェックでバグを早期発見
- **モダンな開発ツール**: Prisma ORM、Jest、ESLint など最新のツールを統合
- **CSS Modules**: スコープ付きCSSによるスタイルの衝突回避
- **テスタビリティ**: 各層が疎結合で、ユニットテスト・統合テストが容易
- **Docker対応**: 環境依存を排除し、チーム全体で同じ環境で開発可能

この構成により、スケーラブルで保守性の高いWebアプリケーションを効率的に開発できます。
