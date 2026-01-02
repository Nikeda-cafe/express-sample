#!/bin/bash

# ECSリソースの初期セットアップスクリプト
# このスクリプトは初回セットアップ時に1回だけ実行してください

# 設定変数（実際の値に置き換えてください）
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-<YOUR_ACCOUNT_ID>}"
REGION="${AWS_REGION:-ap-northeast-1}"
REPOSITORY_NAME="express-app"
CLUSTER_NAME="express-app-cluster"
SERVICE_NAME="express-app-service"
LOG_GROUP_NAME="/ecs/express-app"

# 色付き出力用
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting ECS setup...${NC}"

# AWS_ACCOUNT_IDが設定されていない場合の確認
if [ "$AWS_ACCOUNT_ID" = "<YOUR_ACCOUNT_ID>" ]; then
    echo -e "${RED}Error: AWS_ACCOUNT_ID is not set.${NC}"
    echo "Please set it as an environment variable or edit this script."
    exit 1
fi

# 1. ECRリポジトリの作成
echo -e "${YELLOW}Creating ECR repository...${NC}"
aws ecr create-repository \
    --repository-name $REPOSITORY_NAME \
    --region $REGION \
    --image-scanning-configuration scanOnPush=true \
    > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}ECR repository created${NC}"
else
    echo -e "${YELLOW}ECR repository may already exist${NC}"
fi

# 2. CloudWatch Logsグループの作成
echo -e "${YELLOW}Creating CloudWatch Logs group...${NC}"
aws logs create-log-group --log-group-name $LOG_GROUP_NAME --region $REGION > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}CloudWatch Logs group created${NC}"
else
    echo -e "${YELLOW}CloudWatch Logs group may already exist${NC}"
fi

# 3. ECSクラスターの作成
echo -e "${YELLOW}Creating ECS cluster...${NC}"
aws ecs create-cluster --cluster-name $CLUSTER_NAME --region $REGION > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}ECS cluster created${NC}"
else
    echo -e "${YELLOW}ECS cluster may already exist${NC}"
fi

echo -e "${GREEN}Setup completed!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Update task-definition.json with your AWS_ACCOUNT_ID and REGION"
echo "2. Create Secrets Manager secret for DATABASE_URL (if using secrets):"
echo "   aws secretsmanager create-secret \\"
echo "     --name express-app/database-url \\"
echo "     --secret-string 'mariadb://user:password@<EC2_PRIVATE_IP>:3306/dbname' \\"
echo "     --region $REGION"
echo "3. Register task definition:"
echo "   aws ecs register-task-definition --cli-input-json file://task-definition.json --region $REGION"
echo "4. Create ECS service (after setting up VPC, subnets, security groups):"
echo "   aws ecs create-service \\"
echo "     --cluster $CLUSTER_NAME \\"
echo "     --service-name $SERVICE_NAME \\"
echo "     --task-definition express-app \\"
echo "     --desired-count 1 \\"
echo "     --launch-type FARGATE \\"
echo "     --network-configuration 'awsvpcConfiguration={subnets=[<SUBNET_ID>],securityGroups=[<SECURITY_GROUP_ID>],assignPublicIp=ENABLED}' \\"
echo "     --region $REGION"

