FROM node:20-alpine AS builder

WORKDIR /app

# タイムゾーン設定
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/Asia/Tokyo /etc/localtime && \
    echo "Asia/Tokyo" > /etc/timezone

# Python と build tools のインストール (Prisma用)
RUN apk add --no-cache python3 make g++ openssl openssl-dev

# package.json と package-lock.json をコピー
COPY package*.json ./
COPY prisma ./prisma

# すべての依存関係をインストール（TypeScriptビルド用）
RUN npm ci

# Prismaクライアントの生成
RUN npx prisma generate

# アプリケーションファイルをコピー
COPY . .

# TypeScriptのビルド
RUN npm run build

# 本番用イメージ
FROM node:20-alpine

WORKDIR /app

# タイムゾーン設定
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/Asia/Tokyo /etc/localtime && \
    echo "Asia/Tokyo" > /etc/timezone

# OpenSSLとcurlのインストール（Prisma用 + ヘルスチェック用）
RUN apk add --no-cache openssl openssl-dev curl

# 本番用の依存関係のみインストール
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --only=production && \
    npx prisma generate

# ビルド済みファイルをコピー
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/src/views ./dist/views

# ポート公開
EXPOSE 3000

# 本番サーバー起動
CMD ["npm", "start"]