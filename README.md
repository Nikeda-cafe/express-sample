# Express + TypeScript Application

Express + TypeScript + Prisma + MySQLを使用した、3層アーキテクチャのWebアプリケーションです。

## 技術スタック

- **ランタイム**: Node.js 20.x
- **フレームワーク**: Express.js
- **言語**: TypeScript
- **テンプレートエンジン**: EJS
- **ORM**: Prisma
- **データベース**: MySQL 8.0
- **テスト**: Jest
- **リンター**: ESLint
- **コンテナ**: Docker, Docker Compose

## アーキテクチャ

本プロジェクトは3層アーキテクチャを採用しています：

- **Controller層**: HTTPリクエスト/レスポンスの処理
- **Service層**: ビジネスロジックの実装
- **Repository層**: データアクセスロジック

## セットアップ

### 前提条件

- Docker Desktop がインストールされていること
- Git がインストールされていること

### 初回セットアップ

```bash
# 依存関係のインストール（ローカルで開発する場合）
npm install

# Dockerコンテナのビルドと起動
docker-compose up -d

# データベースのマイグレーション
docker-compose exec app npm run prisma:migrate

# シードデータの投入
docker-compose exec app npm run prisma:seed
```

## 開発

### 開発サーバーの起動

```bash
docker-compose up
```

アプリケーションは http://localhost:3000 で起動します。

### コンテナの停止

```bash
docker-compose down
```

### データベースのリセット

```bash
docker-compose down -v
docker-compose up -d
docker-compose exec app npm run prisma:migrate
docker-compose exec app npm run prisma:seed
```

## コマンド

### 開発

```bash
# 開発サーバー起動（ホットリロード）
npm run dev

# プロダクションビルド
npm run build

# プロダクションサーバー起動
npm start
```

### データベース

```bash
# Prismaクライアント生成
npm run prisma:generate

# マイグレーション実行
npm run prisma:migrate

# シードデータ投入
npm run prisma:seed

# Prisma Studio起動
npm run prisma:studio
```

### テスト

```bash
# テスト実行
npm test

# Watchモード
npm run test:watch

# カバレッジ付き実行
npm run test:coverage
```

### リント

```bash
# ESLint実行
npm run lint

# ESLint自動修正
npm run lint:fix
```

## プロジェクト構成

```
.
├── docker/                 # Docker設定
│   ├── app/
│   │   └── Dockerfile
│   └── mysql/
│       └── my.cnf
├── src/
│   ├── controllers/       # コントローラー層
│   ├── services/          # サービス層
│   ├── repositories/      # リポジトリ層
│   ├── routes/            # ルーティング
│   ├── views/             # EJSテンプレート
│   ├── middleware/        # ミドルウェア
│   ├── types/             # 型定義
│   ├── config/            # 設定
│   ├── app.ts            # Expressアプリ設定
│   └── server.ts         # サーバー起動
├── prisma/
│   ├── schema.prisma     # Prismaスキーマ
│   └── seed.ts           # シードデータ
├── tests/                 # テストファイル
├── public/                # 静的ファイル
└── docker-compose.yml
```

## トラブルシューティング

### ポート競合

ポート3000または3306が使用中の場合、`docker-compose.yml`のポート設定を変更してください。

### M3 Macでの問題

`docker-compose.yml`に`platform: linux/amd64`を設定済みです。問題が発生する場合は、Docker Desktopの設定を確認してください。

### Prismaクライアントのエラー

```bash
docker-compose exec app npx prisma generate
```

## ライセンス

MIT
