.PHONY: help shell shell-app shell-db up down restart logs logs-app logs-db ps build clean batch batch-create-sample-post prisma-generate prisma-migrate prisma-studio

# デフォルトターゲット
help:
	@echo "Available commands:"
	@echo "  make shell-app          - appコンテナに接続（シェル）"
	@echo "  make shell-db           - dbコンテナに接続（MySQL）"
	@echo "  make up                 - Docker Composeでサービスを起動"
	@echo "  make down               - Docker Composeでサービスを停止"
	@echo "  make restart            - Docker Composeでサービスを再起動"
	@echo "  make logs               - すべてのコンテナのログを表示"
	@echo "  make logs-app           - appコンテナのログを表示"
	@echo "  make logs-db            - dbコンテナのログを表示"
	@echo "  make ps                 - コンテナの状態を表示"
	@echo "  make build              - Dockerイメージをビルド"
	@echo "  make clean              - コンテナとボリュームを削除"
	@echo "  make batch-create-sample-post - バッチを実行（ローカル）"
	@echo "  make prisma-generate    - Prismaクライアントを生成"
	@echo "  make prisma-migrate     - Prismaマイグレーションを実行"
	@echo "  make prisma-studio      - Prisma Studioを起動"

# appコンテナに接続（シェル）
shell-app:
	docker-compose exec app sh

# dbコンテナに接続（MySQL）
shell-db:
	docker-compose exec db mysql -u appuser -papppassword appdb

# Docker Composeでサービスを起動
up:
	docker-compose up -d

# Docker Composeでサービスを停止
down:
	docker-compose down

# Docker Composeでサービスを再起動
restart:
	docker-compose restart

# すべてのコンテナのログを表示
logs:
	docker-compose logs -f

# appコンテナのログを表示
logs-app:
	docker-compose logs -f app

# dbコンテナのログを表示
logs-db:
	docker-compose logs -f db

# コンテナの状態を表示
ps:
	docker-compose ps

# Dockerイメージをビルド
build:
	docker-compose build

# コンテナとボリュームを削除（注意：データが削除されます）
clean:
	docker-compose down -v

# バッチを実行（ローカル）
batch-create-sample-post:
	npm run batch:create-sample-post

# Prismaクライアントを生成
prisma-generate:
	docker-compose exec app npm run prisma:generate

# Prismaマイグレーションを実行
prisma-migrate:
	docker-compose exec app npm run prisma:migrate

# Prisma Studioを起動
prisma-studio:
	docker-compose exec app npm run prisma:studio
