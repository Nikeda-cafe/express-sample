#!/bin/bash

# 設定変数（実際の値に置き換えてください）
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-<YOUR_ACCOUNT_ID>}"
REGION="${AWS_REGION:-ap-northeast-1}"
REPOSITORY_NAME="express-app"
IMAGE_TAG="${IMAGE_TAG:-latest}"
CLUSTER_NAME="${CLUSTER_NAME:-express-app-cluster}"
SERVICE_NAME="${SERVICE_NAME:-express-app-service}"

# 色付き出力用
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting deployment...${NC}"

# AWS_ACCOUNT_IDが設定されていない場合の確認
if [ "$AWS_ACCOUNT_ID" = "<YOUR_ACCOUNT_ID>" ]; then
    echo -e "${RED}Error: AWS_ACCOUNT_ID is not set.${NC}"
    echo "Please set it as an environment variable or edit this script."
    exit 1
fi

# ECRにログイン
echo -e "${YELLOW}Logging in to ECR...${NC}"
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"
aws ecr get-login-password --region ${REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to login to ECR${NC}"
    exit 1
fi

# イメージをビルド（amd64用にクロスコンパイル）
echo -e "${YELLOW}Building Docker image for linux/amd64...${NC}"
docker build --platform linux/amd64 -t express-app:latest .

if [ $? -ne 0 ]; then
    echo -e "${RED}Docker build failed${NC}"
    exit 1
fi

# タグ付け
echo -e "${YELLOW}Tagging image...${NC}"
ECR_IMAGE_URI="${ECR_REGISTRY}/${REPOSITORY_NAME}:${IMAGE_TAG}"
docker tag express-app:latest ${ECR_IMAGE_URI}

# ECRにpush
echo -e "${YELLOW}Pushing image to ECR...${NC}"
docker push ${ECR_IMAGE_URI}

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to push image to ECR${NC}"
    exit 1
fi

# タスク定義を更新（サービスが存在する場合）
echo -e "${YELLOW}Updating ECS service...${NC}"
aws ecs update-service \
    --cluster $CLUSTER_NAME \
    --service $SERVICE_NAME \
    --force-new-deployment \
    --region $REGION \
    > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Service update initiated successfully${NC}"
else
    echo -e "${YELLOW}Service update skipped (service may not exist yet)${NC}"
fi

echo -e "${GREEN}Deployment completed!${NC}"
echo -e "Image URI: ${AWS_ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${REPOSITORY_NAME}:${IMAGE_TAG}"

