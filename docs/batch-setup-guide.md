# バッチ実行セットアップガイド

## 概要

このプロジェクトでは、EventBridgeを使用してECSタスクを起動し、バッチジョブを実行する構成になっています。

## ディレクトリ構成

```
src/
└── batch/
    ├── index.ts                    # バッチ実行のエントリーポイント
    └── create-sample-post.ts      # postsテーブルにサンプルデータを挿入するバッチ
```

## ローカルでの実行方法

### 1. 開発環境での実行

```bash
# 直接実行
npm run batch:create-sample-post

# または
ts-node src/batch/create-sample-post.ts
```

### 2. ビルド後の実行

```bash
# ビルド
npm run build

# バッチ実行（環境変数でジョブ名を指定）
BATCH_JOB=create-sample-post node dist/batch/index.js

# または引数で指定
node dist/batch/index.js create-sample-post
```

## ECSタスクでの実行

### 1. タスク定義の登録

```bash
aws ecs register-task-definition \
  --cli-input-json file://task-definition-batch.json
```

### 2. 手動実行（テスト用）

```bash
aws ecs run-task \
  --cluster express-app-cluster \
  --task-definition express-app-batch \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxxxxxxxx],securityGroups=[sg-xxxxxxxxx],assignPublicIp=ENABLED}"
```

## EventBridgeでのスケジュール実行

### 1. IAMロールの作成

EventBridgeがECSタスクを起動するためのIAMロールが必要です。

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecs:RunTask"
      ],
      "Resource": "arn:aws:ecs:ap-northeast-1:270094330805:task-definition/express-app-batch"
    },
    {
      "Effect": "Allow",
      "Action": [
        "iam:PassRole"
      ],
      "Resource": [
        "arn:aws:iam::270094330805:role/ecsTaskExecutionRole",
        "arn:aws:iam::270094330805:role/ecsTaskRole"
      ]
    }
  ]
}
```

### 2. EventBridgeルールの作成

```bash
aws events put-rule \
  --name express-app-batch-create-sample-post \
  --schedule-expression "cron(0 2 * * ? *)" \
  --state ENABLED \
  --description "Run create-sample-post batch job daily at 2 AM JST"

aws events put-targets \
  --rule express-app-batch-create-sample-post \
  --targets file://eventbridge-target.json
```

### 3. eventbridge-target.json の例

```json
[
  {
    "Id": "1",
    "Arn": "arn:aws:ecs:ap-northeast-1:270094330805:cluster/express-app-cluster",
    "RoleArn": "arn:aws:iam::270094330805:role/ecsEventsRole",
    "EcsParameters": {
      "TaskDefinitionArn": "arn:aws:ecs:ap-northeast-1:270094330805:task-definition/express-app-batch",
      "LaunchType": "FARGATE",
      "NetworkConfiguration": {
        "awsvpcConfiguration": {
          "Subnets": ["subnet-xxxxxxxxx"],
          "SecurityGroups": ["sg-xxxxxxxxx"],
          "AssignPublicIp": "ENABLED"
        }
      },
      "PlatformVersion": "LATEST"
    }
  }
]
```

## 新しいバッチジョブの追加方法

1. `src/batch/` ディレクトリに新しいバッチファイルを作成
2. `src/batch/index.ts` に新しいジョブを追加
3. `task-definition-batch.json` の環境変数 `BATCH_JOB` を変更するか、新しいタスク定義を作成

例：

```typescript
// src/batch/my-new-batch.ts
export async function executeMyNewBatch(): Promise<void> {
  // バッチ処理の実装
}

// src/batch/index.ts に追加
import { executeMyNewBatch } from './my-new-batch';

switch (jobName) {
  case 'create-sample-post':
    await executeCreateSamplePost();
    break;
  case 'my-new-batch':
    await executeMyNewBatch();
    break;
  // ...
}
```

## ログの確認

ECSタスクのログは CloudWatch Logs で確認できます：

- ロググループ: `/ecs/express-app-batch`
- ログストリーム: `batch/{task-id}`

```bash
aws logs tail /ecs/express-app-batch --follow
```

## トラブルシューティング

### タスクが起動しない場合

1. IAMロールの権限を確認
2. サブネットとセキュリティグループの設定を確認
3. タスク定義のイメージURIを確認

### バッチが失敗する場合

1. CloudWatch Logsでエラーログを確認
2. データベース接続設定を確認
3. 環境変数が正しく設定されているか確認
