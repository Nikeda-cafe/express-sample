# CI/CDパイプラインセットアップガイド

このドキュメントでは、AWS CodePipelineとCodeBuildを使用して、ExpressアプリケーションをECSに自動デプロイするCI/CDパイプラインの構築方法を説明します。

## アーキテクチャ概要

```
GitHub Repository
    ↓ (push event)
CodePipeline (Source Stage)
    ↓
CodeBuild (Build Stage)
    ├─ Dockerイメージのビルド
    ├─ ECRへのプッシュ
    ├─ タスク定義の更新
    └─ ECSサービスの更新
    ↓
ECS Fargate Service
```

## 前提条件

- AWSアカウントが設定されていること
- AWS CLIがインストール・設定されていること
- GitHubリポジトリが存在すること
- GitHub Personal Access Tokenが作成されていること
- ECSクラスターとサービスが既に作成されていること
- ECRリポジトリが既に作成されていること

## セットアップ手順

### ステップ1: GitHub Personal Access Tokenの作成

1. GitHubにログイン
2. **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
3. **Generate new token (classic)** をクリック
4. 以下の設定を入力：
   - **Note**: `AWS CodePipeline Access`（任意の名前）
   - **Expiration**: 適切な有効期限を選択
   - **Scopes**: `repo` にチェック（Full control of private repositories）
5. **Generate token** をクリック
6. 表示されたトークンをコピー（後で使用します）

### ステップ2: 環境変数の設定

```bash
export AWS_ACCOUNT_ID="your-aws-account-id"
export AWS_REGION="ap-northeast-1"
export GITHUB_OWNER="your-github-username"
export GITHUB_REPO="express"  # リポジトリ名
export GITHUB_BRANCH="main"   # デプロイ対象のブランチ
export GITHUB_TOKEN="your-github-personal-access-token"
```

### ステップ3: CI/CDパイプラインのデプロイ

#### 方法A: セットアップスクリプトを使用（推奨）

```bash
chmod +x cicd-setup.sh
./cicd-setup.sh
```

#### 方法B: CloudFormationを直接デプロイ

```bash
aws cloudformation deploy \
    --template-file cicd-pipeline.yaml \
    --stack-name express-app-cicd-pipeline \
    --capabilities CAPABILITY_NAMED_IAM \
    --region ap-northeast-1 \
    --parameter-overrides \
        GitHubOwner=your-github-username \
        GitHubRepo=express \
        GitHubBranch=main \
        GitHubToken=your-github-token \
        ECRRepositoryName=express-app \
        ECSClusterName=express-app-cluster \
        ECSServiceName=express-app-service \
        AWSAccountId=your-account-id \
        AWSRegion=ap-northeast-1
```

### ステップ4: パイプラインの確認

1. AWSマネージコンソールにログイン
2. **CodePipeline**サービスに移動
3. `express-app-pipeline` を確認
4. 初回実行時は手動でパイプラインを開始することもできます：

```bash
aws codepipeline start-pipeline-execution \
    --name express-app-pipeline \
    --region ap-northeast-1
```

## パイプラインの動作

### 自動トリガー

GitHubリポジトリの指定ブランチ（デフォルト: `main`）にプッシュされると、自動的にパイプラインが実行されます。

### パイプラインのステージ

1. **Source Stage**
   - GitHubから最新のコードを取得

2. **Build Stage**
   - `buildspec.yml`に基づいて以下を実行：
     - Dockerイメージのビルド（linux/amd64）
     - ECRへのイメージプッシュ
     - タスク定義の更新（新しいイメージURIを反映）
     - ECSサービスの更新（強制再デプロイ）

### ビルド仕様（buildspec.yml）

`buildspec.yml`ファイルには、CodeBuildが実行する手順が定義されています：

- **pre_build**: ECRへのログイン、環境変数の設定
- **build**: Dockerイメージのビルドとタグ付け
- **post_build**: ECRへのプッシュ、タスク定義の更新、ECSサービスの更新

## トラブルシューティング

### パイプラインが開始されない

1. **GitHub接続の確認**
   - CodePipelineコンソールで接続状態を確認
   - GitHubトークンが有効か確認

2. **IAM権限の確認**
   - CodePipelineとCodeBuildのIAMロールに適切な権限があるか確認

### ビルドが失敗する

1. **CloudWatch Logsを確認**
   - CodeBuildプロジェクトのログを確認：
     ```
     /aws/codebuild/express-app-build
     ```

2. **ECRへのアクセス権限**
   - CodeBuildのIAMロールにECRへのプッシュ権限があるか確認

3. **ECSへのアクセス権限**
   - CodeBuildのIAMロールにECSサービスの更新権限があるか確認

### デプロイが失敗する

1. **タスク定義の確認**
   - タスク定義のJSONが正しい形式か確認
   - イメージURIが正しいか確認

2. **ECSサービスの状態確認**
   ```bash
   aws ecs describe-services \
       --cluster express-app-cluster \
       --services express-app-service \
       --region ap-northeast-1
   ```

3. **CloudWatch Logsを確認**
   - ECSタスクのログを確認：
     ```
     /ecs/express-app
     ```

## 手動デプロイ

CI/CDパイプラインを使用せずに手動でデプロイする場合：

```bash
./deploy.sh
```

または、ECSサービスを直接更新：

```bash
aws ecs update-service \
    --cluster express-app-cluster \
    --service express-app-service \
    --force-new-deployment \
    --region ap-northeast-1
```

## パイプラインの更新

パイプライン設定を変更する場合：

1. `cicd-pipeline.yaml`を編集
2. CloudFormationスタックを更新：

```bash
aws cloudformation update-stack \
    --stack-name express-app-cicd-pipeline \
    --template-file cicd-pipeline.yaml \
    --capabilities CAPABILITY_NAMED_IAM \
    --region ap-northeast-1 \
    --parameters file://cicd-parameters.json
```

## ビルド仕様のカスタマイズ

`buildspec.yml`を編集することで、ビルドプロセスをカスタマイズできます：

- テストの実行
- セキュリティスキャン
- 通知の送信
- 複数環境へのデプロイ

例：テストを追加する場合

```yaml
phases:
  pre_build:
    commands:
      - npm install
  build:
    commands:
      - npm test
      - npm run build
      # ... 既存のコマンド
```

## セキュリティのベストプラクティス

1. **GitHubトークンの管理**
   - AWS Secrets ManagerまたはParameter Storeに保存
   - 定期的にローテーション

2. **IAMロールの最小権限の原則**
   - 必要最小限の権限のみを付与

3. **イメージのスキャン**
   - ECRのイメージスキャンを有効化
   - 脆弱性が見つかった場合はビルドを失敗させる

4. **環境変数の管理**
   - 機密情報はSecrets ManagerまたはParameter Storeを使用

## 参考リソース

- [AWS CodePipeline ドキュメント](https://docs.aws.amazon.com/codepipeline/)
- [AWS CodeBuild ドキュメント](https://docs.aws.amazon.com/codebuild/)
- [buildspec.yml リファレンス](https://docs.aws.amazon.com/codebuild/latest/userguide/build-spec-ref.html)
- [ECS デプロイメントガイド](./ecs-deployment-guide.md)

## 補足: 複数環境へのデプロイ

本番環境とステージング環境など、複数の環境にデプロイする場合：

1. 各環境用のCodeBuildプロジェクトを作成
2. CodePipelineに複数のデプロイステージを追加
3. 環境変数で環境を切り替え

詳細は、AWS CodePipelineのマルチステージデプロイメントのドキュメントを参照してください。

