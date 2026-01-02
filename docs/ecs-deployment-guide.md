# ECSデプロイメントガイド

このドキュメントでは、ExpressアプリケーションをAWS ECS（Elastic Container Service）にデプロイする手順を説明します。

## 前提条件

- AWSアカウントが設定されていること
- AWS CLIがインストール・設定されていること（コマンド版の場合）
- Dockerがインストールされていること
- EC2にMariaDBがインストール・設定されていること
- データベース接続情報（ホスト、ポート、ユーザー名、パスワード、データベース名）を把握していること

## アーキテクチャ概要

- **コンテナレジストリ**: Amazon ECR
- **コンテナオーケストレーション**: Amazon ECS (Fargate)
- **データベース**: EC2上のMariaDB
- **ログ**: Amazon CloudWatch Logs

---

## 方法1: AWS CLI（コマンド版）

### ステップ1: 環境変数の設定

```bash
export AWS_ACCOUNT_ID="270094330805"  # 実際のAWSアカウントIDに置き換え
export AWS_REGION="ap-northeast-1"
```

### ステップ2: ECRリポジトリの作成

```bash
aws ecr create-repository \
  --repository-name express-app \
  --region $AWS_REGION \
  --image-scanning-configuration scanOnPush=true
```

### ステップ3: CloudWatch Logsグループの作成

```bash
aws logs create-log-group \
  --log-group-name /ecs/express-app \
  --region $AWS_REGION
```

### ステップ4: ECSクラスターの作成

```bash
aws ecs create-cluster \
  --cluster-name express-app-cluster \
  --region $AWS_REGION
```

### ステップ5: Secrets Managerにデータベース接続情報を保存（オプション）

**方法A: Secrets Managerを使用する場合（推奨）**

```bash
aws secretsmanager create-secret \
  --name express-app/database-url \
  --secret-string "mariadb://<USER>:<PASSWORD>@<EC2_PRIVATE_IP>:3306/<DATABASE_NAME>" \
  --region $AWS_REGION
```

**方法B: 環境変数で直接指定する場合**

この場合は、ステップ6で`task-definition-simple.json`を使用してください。

### ステップ6: タスク定義の準備

#### 方法A: Secrets Managerを使用する場合

`task-definition.json`を編集して、以下のプレースホルダーを実際の値に置き換えます：

- `<AWS_ACCOUNT_ID>` → 実際のAWSアカウントID（例: `270094330805`）
- `<REGION>` → リージョン（例: `ap-northeast-1`）

```bash
# エディタで編集
vi task-definition.json
# または
nano task-definition.json
```

#### 方法B: 環境変数で直接指定する場合

`task-definition-simple.json`を編集して、以下のプレースホルダーを実際の値に置き換えます：

- `<AWS_ACCOUNT_ID>` → 実際のAWSアカウントID
- `<REGION>` → リージョン
- `<USER>` → データベースユーザー名
- `<PASSWORD>` → データベースパスワード
- `<EC2_PRIVATE_IP>` → EC2インスタンスのプライベートIPアドレス
- `<DATABASE_NAME>` → データベース名

### ステップ7: タスク定義の登録

```bash
# Secrets Managerを使用する場合
aws ecs register-task-definition \
  --cli-input-json file://task-definition.json \
  --region $AWS_REGION

# または、環境変数で直接指定する場合
aws ecs register-task-definition \
  --cli-input-json file://task-definition-simple.json \
  --region $AWS_REGION
```

### ステップ8: Dockerイメージのビルドとプッシュ

`deploy.sh`スクリプトを使用するか、手動で実行：

```bash
# ECRにログイン
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# イメージをビルド（M3 Macの場合、amd64用にクロスコンパイル）
docker build --platform linux/amd64 -t express-app:latest .

# タグ付け
docker tag express-app:latest \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/express-app:latest

# ECRにプッシュ
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/express-app:latest
```

または、`deploy.sh`スクリプトを使用：

```bash
./deploy.sh
```

### ステップ9: VPC、サブネット、セキュリティグループの準備

ECSタスクがEC2のMariaDBに接続できるように、以下を設定します：

1. **VPC**: ECSタスクとEC2が同じVPC内にあることを確認
2. **サブネット**: パブリックサブネットまたはプライベートサブネット（NAT Gateway経由でインターネット接続可能）
3. **セキュリティグループ**: 
   - ECSタスクのセキュリティグループからEC2のMariaDB（ポート3306）へのアウトバウンド通信を許可
   - 必要に応じて、ALBからのインバウンド通信（ポート3000）を許可

### ステップ10: ECSサービスの作成

```bash
aws ecs create-service \
  --cluster express-app-cluster \
  --service-name express-app-service \
  --task-definition express-app \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[<SUBNET_ID_1>,<SUBNET_ID_2>],securityGroups=[<SECURITY_GROUP_ID>],assignPublicIp=ENABLED}" \
  --region $AWS_REGION
```

**パラメータの説明:**
- `<SUBNET_ID_1>`, `<SUBNET_ID_2>`: 使用するサブネットID（複数指定可能）
- `<SECURITY_GROUP_ID>`: ECSタスク用のセキュリティグループID
- `assignPublicIp=ENABLED`: パブリックIPを割り当てる場合（プライベートサブネットの場合は`DISABLED`）

### ステップ11: サービスの確認

```bash
# サービスの状態を確認
aws ecs describe-services \
  --cluster express-app-cluster \
  --services express-app-service \
  --region $AWS_REGION

# タスクの状態を確認
aws ecs list-tasks \
  --cluster express-app-cluster \
  --service-name express-app-service \
  --region $AWS_REGION
```

---

## 方法2: AWSマネージコンソール版

### ステップ1: ECRリポジトリの作成

1. AWSマネージコンソールにログイン
2. **Amazon ECR**サービスに移動
3. 左メニューから「リポジトリ」を選択
4. 「リポジトリの作成」ボタンをクリック
5. 以下の設定を入力：
   - **可視性設定**: プライベート
   - **リポジトリ名**: `express-app`
   - **タグの追加**: 任意
   - **暗号化設定**: デフォルト（AWSマネージドキー）
   - **スキャン設定**: 「プッシュ時にスキャン」にチェック
6. 「リポジトリの作成」をクリック

### ステップ2: CloudWatch Logsグループの作成

1. **Amazon CloudWatch**サービスに移動
2. 左メニューから「ログ」→「ロググループ」を選択
3. 「ロググループの作成」をクリック
4. **ロググループ名**: `/ecs/express-app` を入力
5. 「ロググループの作成」をクリック

### ステップ3: ECSクラスターの作成

1. **Amazon ECS**サービスに移動
2. 左メニューから「クラスター」を選択
3. 「クラスターの作成」をクリック
4. **クラスターテンプレート**: 「空のクラスター」を選択
5. **クラスター名**: `express-app-cluster` を入力
6. 「作成」をクリック

### ステップ4: Secrets Managerにデータベース接続情報を保存（オプション）

**方法A: Secrets Managerを使用する場合（推奨）**

1. **AWS Secrets Manager**サービスに移動
2. 「シークレットの保存」をクリック
3. **シークレットタイプ**: 「その他のシークレット（例：APIキー）」を選択
4. **シークレット値**: プレーンテキストで `mariadb://<USER>:<PASSWORD>@<EC2_PRIVATE_IP>:3306/<DATABASE_NAME>` を入力
5. **シークレット名**: `express-app/database-url` を入力
6. 「次へ」をクリック
7. 自動ローテーションは無効のまま「次へ」
8. 「保存」をクリック

**方法B: 環境変数で直接指定する場合**

この場合は、ステップ5で環境変数として直接入力します。

### ステップ5: タスク定義の作成

1. **Amazon ECS**サービスに移動
2. 左メニューから「タスク定義」を選択
3. 「新しいタスク定義の作成」をクリック
4. **起動タイプの互換性**: 「Fargate」を選択
5. **タスク定義名**: `express-app` を入力
6. **タスクロール**: デフォルト（または適切なIAMロール）
7. **タスク実行ロール**: デフォルト（または適切なIAMロール）
8. **タスクサイズ**:
   - **タスクメモリ (GB)**: `0.5 GB`
   - **タスクCPU (vCPU)**: `0.25 vCPU`

9. **コンテナの追加**をクリック：
   - **コンテナ名**: `express-app`
   - **イメージURI**: `270094330805.dkr.ecr.ap-northeast-1.amazonaws.com/express-app:latest`（ECRリポジトリのURIをコピー）
   - **メモリ制限 (MiB)**: `512`
   - **ポートマッピング**: 
     - **コンテナポート**: `3000`
     - **プロトコル**: `tcp`

10. **環境変数**セクション：
    - **NODE_ENV**: `production`
    - **PORT**: `3000`
    - **DATABASE_URL**（方法Bの場合）: `mariadb://<USER>:<PASSWORD>@<EC2_PRIVATE_IP>:3306/<DATABASE_NAME>`

11. **シークレット**セクション（方法Aの場合）：
    - **環境変数**: `DATABASE_URL`
    - **値**: Secrets Managerから `express-app/database-url` を選択

12. **ログ設定**セクション：
    - **ログドライバー**: `awslogs`
    - **ログオプション**:
      - **awslogs-group**: `/ecs/express-app`
      - **awslogs-region**: `ap-northeast-1`
      - **awslogs-stream-prefix**: `ecs`

13. **ヘルスチェック**セクション（オプション）：
    - **コマンド**: `CMD-SHELL,wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1`
    - **間隔**: `30`
    - **タイムアウト**: `5`
    - **開始期間**: `60`
    - **再試行回数**: `3`

14. 「作成」をクリック

### ステップ6: Dockerイメージのビルドとプッシュ

#### 6-1. ローカルでイメージをビルド

```bash
# プロジェクトルートで実行
docker build --platform linux/amd64 -t express-app:latest .
```

#### 6-2. ECRにプッシュ

1. ECRコンソールで`express-app`リポジトリを開く
2. 「プッシュコマンドの表示」をクリック
3. 表示されたコマンドを実行：

```bash
# ECRにログイン
aws ecr get-login-password --region ap-northeast-1 | \
  docker login --username AWS --password-stdin \
  270094330805.dkr.ecr.ap-northeast-1.amazonaws.com

# タグ付け
docker tag express-app:latest \
  270094330805.dkr.ecr.ap-northeast-1.amazonaws.com/express-app:latest

# プッシュ
docker push 270094330805.dkr.ecr.ap-northeast-1.amazonaws.com/express-app:latest
```

または、`deploy.sh`スクリプトを使用：

```bash
./deploy.sh
```

### ステップ7: VPC、サブネット、セキュリティグループの準備

#### 7-1. VPCの確認

1. **Amazon VPC**サービスに移動
2. EC2インスタンスが使用しているVPCを確認
3. ECSタスクも同じVPCを使用する必要があります

#### 7-2. サブネットの確認

1. **サブネット**を確認
2. パブリックサブネットまたはプライベートサブネット（NAT Gateway経由でインターネット接続可能）を選択
3. サブネットIDをメモ

#### 7-3. セキュリティグループの作成

1. **セキュリティグループ**を選択
2. 「セキュリティグループの作成」をクリック
3. **名前**: `ecs-express-app-sg` を入力
4. **説明**: `ECS Express App Security Group` を入力
5. **VPC**: EC2インスタンスと同じVPCを選択
6. **インバウンドルール**:
   - タイプ: `カスタムTCP`
   - ポート: `3000`
   - ソース: ALBのセキュリティグループ（ALBを使用する場合）、または `0.0.0.0/0`（直接アクセスの場合）
7. **アウトバウンドルール**:
   - タイプ: `カスタムTCP`
   - ポート: `3306`
   - 宛先: EC2インスタンスのセキュリティグループ（MariaDB用）
8. 「セキュリティグループの作成」をクリック

### ステップ8: ECSサービスの作成

1. **Amazon ECS**サービスに移動
2. `express-app-cluster`クラスターを選択
3. 「サービス」タブを選択
4. 「作成」をクリック
5. 以下の設定を入力：

   **基本設定:**
   - **起動タイプ**: `Fargate`
   - **タスク定義**:
     - **ファミリー**: `express-app`
     - **リビジョン**: 最新（または特定のリビジョン）
   - **サービス名**: `express-app-service`
   - **サービスタイプ**: `REPLICA`
   - **タスクの数**: `1`

   **ネットワーク設定:**
   - **VPC**: EC2インスタンスと同じVPCを選択
   - **サブネット**: 使用するサブネットを選択（複数選択可能）
   - **セキュリティグループ**: ステップ7-3で作成したセキュリティグループを選択
   - **パブリックIPの自動割り当て**: 有効（パブリックサブネットの場合）

   **ロードバランサー（オプション）:**
   - ALBを使用する場合は、ここで設定

   **コンテナとヘルスチェック:**
   - デフォルトのままでOK

6. 「作成」をクリック

### ステップ9: サービスの確認

1. クラスターの「サービス」タブで、`express-app-service`の状態を確認
2. 「タスク」タブで、タスクの状態を確認
3. タスクが「実行中」になるまで待機（数分かかる場合があります）

### ステップ10: アプリケーションへのアクセス

#### 方法A: パブリックIPを使用する場合

1. タスクの詳細を開く
2. 「ネットワーク」セクションでパブリックIPを確認
3. ブラウザで `http://<パブリックIP>:3000` にアクセス

#### 方法B: ALBを使用する場合

1. ALBのDNS名を確認
2. ブラウザで `http://<ALB_DNS_NAME>` にアクセス

---

## トラブルシューティング

### タスクが起動しない

1. **CloudWatch Logsを確認**
   - `/ecs/express-app`ロググループを確認
   - エラーメッセージを確認

2. **セキュリティグループの確認**
   - ECSタスクからEC2のMariaDB（ポート3306）への通信が許可されているか確認

3. **タスク定義の確認**
   - イメージURIが正しいか確認
   - 環境変数が正しく設定されているか確認

### データベース接続エラー

1. **DATABASE_URLの確認**
   - EC2のプライベートIPアドレスが正しいか確認
   - ユーザー名、パスワード、データベース名が正しいか確認

2. **ネットワークの確認**
   - ECSタスクとEC2が同じVPC内にあるか確認
   - セキュリティグループでポート3306が許可されているか確認

3. **MariaDBの設定確認**
   - `bind-address`が`0.0.0.0`または適切なIPアドレスに設定されているか確認
   - ファイアウォールでポート3306が開いているか確認

### イメージのプッシュに失敗する

1. **ECRへのログイン確認**
   ```bash
   aws ecr get-login-password --region ap-northeast-1 | \
     docker login --username AWS --password-stdin \
     270094330805.dkr.ecr.ap-northeast-1.amazonaws.com
   ```

2. **IAM権限の確認**
   - ECRへのプッシュ権限があるか確認

### ビルドエラー

1. **プラットフォーム指定の確認**
   - M3 Macの場合は `--platform linux/amd64` を指定

2. **TypeScriptのビルドエラー**
   - ローカルで `npm run build` を実行してエラーを確認

---

## 継続的なデプロイ

新しいバージョンをデプロイする場合：

### コマンド版

```bash
# イメージをビルドしてプッシュ
./deploy.sh

# サービスを強制的に再デプロイ
aws ecs update-service \
  --cluster express-app-cluster \
  --service express-app-service \
  --force-new-deployment \
  --region ap-northeast-1
```

### マネージコンソール版

1. 新しいイメージをビルドしてECRにプッシュ
2. ECSコンソールでサービスを選択
3. 「更新」をクリック
4. 「新しいデプロイメントを強制する」にチェック
5. 「更新」をクリック

---

## 参考リソース

- [Amazon ECS ドキュメント](https://docs.aws.amazon.com/ecs/)
- [Amazon ECR ドキュメント](https://docs.aws.amazon.com/ecr/)
- [AWS Fargate ドキュメント](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate.html)

---

## 補足: スクリプトの使用

プロジェクトには以下の便利なスクリプトが含まれています：

- **`ecs-setup.sh`**: 初回セットアップ（ECRリポジトリ、CloudWatch Logs、ECSクラスターの作成）
- **`deploy.sh`**: DockerイメージのビルドとECRへのプッシュ

使用方法：

```bash
# 初回セットアップ
export AWS_ACCOUNT_ID="270094330805"
export AWS_REGION="ap-northeast-1"
./ecs-setup.sh

# デプロイ
./deploy.sh
```

