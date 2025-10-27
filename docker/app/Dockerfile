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
RUN npm install

# アプリケーションファイルをコピー
COPY . .

# Prismaクライアントの生成
RUN npx prisma generate

# ポート公開
EXPOSE 3000

# 開発サーバー起動
CMD ["npm", "run", "dev"]
