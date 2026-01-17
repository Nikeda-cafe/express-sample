#!/bin/bash

# CI/CDパイプラインのセットアップスクリプト
# CodePipelineとCodeBuildを使用してECSへの自動デプロイを設定します

# 設定変数（実際の値に置き換えてください）
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-<YOUR_ACCOUNT_ID>}"
REGION="${AWS_REGION:-ap-northeast-1}"
GITHUB_OWNER="${GITHUB_OWNER:-<YOUR_GITHUB_USERNAME>}"
GITHUB_REPO="${GITHUB_REPO:-express}"
GITHUB_BRANCH="${GITHUB_BRANCH:-main}"
GITHUB_TOKEN="${GITHUB_TOKEN:-<YOUR_GITHUB_TOKEN>}"
ECR_REPOSITORY_NAME="express-app"
ECS_CLUSTER_NAME="express-app-cluster"
ECS_SERVICE_NAME="express-app-service"

# 色付き出力用
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}CI/CD Pipeline Setup for Express App${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 必須パラメータの確認
if [ "$AWS_ACCOUNT_ID" = "<YOUR_ACCOUNT_ID>" ]; then
    echo -e "${RED}Error: AWS_ACCOUNT_ID is not set.${NC}"
    echo "Please set it as an environment variable:"
    echo "  export AWS_ACCOUNT_ID=\"your-account-id\""
    exit 1
fi

if [ "$GITHUB_OWNER" = "<YOUR_GITHUB_USERNAME>" ]; then
    echo -e "${RED}Error: GITHUB_OWNER is not set.${NC}"
    echo "Please set it as an environment variable:"
    echo "  export GITHUB_OWNER=\"your-github-username\""
    exit 1
fi

if [ "$GITHUB_TOKEN" = "<YOUR_GITHUB_TOKEN>" ]; then
    echo -e "${RED}Error: GITHUB_TOKEN is not set.${NC}"
    echo "Please set it as an environment variable:"
    echo "  export GITHUB_TOKEN=\"your-github-personal-access-token\""
    echo ""
    echo "GitHub Personal Access Tokenの作成方法:"
    echo "1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)"
    echo "2. Generate new token (classic)"
    echo "3. 以下のスコープを選択:"
    echo "   - repo (Full control of private repositories)"
    echo "4. トークンをコピーして環境変数に設定"
    exit 1
fi

echo -e "${GREEN}Configuration:${NC}"
echo "  AWS Account ID: $AWS_ACCOUNT_ID"
echo "  Region: $REGION"
echo "  GitHub Owner: $GITHUB_OWNER"
echo "  GitHub Repo: $GITHUB_REPO"
echo "  GitHub Branch: $GITHUB_BRANCH"
echo "  ECR Repository: $ECR_REPOSITORY_NAME"
echo "  ECS Cluster: $ECS_CLUSTER_NAME"
echo "  ECS Service: $ECS_SERVICE_NAME"
echo ""

read -p "Continue with setup? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Setup cancelled."
    exit 1
fi

# CloudFormationテンプレートのデプロイ
echo -e "${YELLOW}Deploying CI/CD pipeline with CloudFormation...${NC}"

aws cloudformation deploy \
    --template-file cicd-pipeline.yaml \
    --stack-name express-app-cicd-pipeline \
    --capabilities CAPABILITY_NAMED_IAM \
    --region $REGION \
    --parameter-overrides \
        GitHubOwner=$GITHUB_OWNER \
        GitHubRepo=$GITHUB_REPO \
        GitHubBranch=$GITHUB_BRANCH \
        GitHubToken=$GITHUB_TOKEN \
        ECRRepositoryName=$ECR_REPOSITORY_NAME \
        ECSClusterName=$ECS_CLUSTER_NAME \
        ECSServiceName=$ECS_SERVICE_NAME \
        AWSAccountId=$AWS_ACCOUNT_ID \
        AWSRegion=$REGION

if [ $? -eq 0 ]; then
    echo -e "${GREEN}CI/CD pipeline deployed successfully!${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. CodePipelineコンソールでパイプラインの状態を確認:"
    echo "   https://${REGION}.console.aws.amazon.com/codesuite/codepipeline/pipelines/express-app-pipeline/view"
    echo ""
    echo "2. GitHubリポジトリに変更をプッシュすると、自動的にパイプラインが実行されます"
    echo ""
    echo "3. 初回実行時は手動でパイプラインを開始することもできます:"
    echo "   aws codepipeline start-pipeline-execution --name express-app-pipeline --region $REGION"
    echo ""
    echo -e "${GREEN}Setup completed!${NC}"
else
    echo -e "${RED}Failed to deploy CI/CD pipeline${NC}"
    exit 1
fi

