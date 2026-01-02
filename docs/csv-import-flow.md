# CSVインポートシステム フロー図

## システム全体のフロー

```mermaid
graph TB
    A[ユーザー] -->|CSVファイルアップロード| B[S3 Bucket]
    B -->|Object Created Event| C[EventBridge]
    C -->|イベントトリガー| D[Step Functions]
    D -->|ワークフロー開始| E[ValidateS3Event]
    E --> F{ファイルサイズチェック}
    F -->|100MB以下| G[Run ECS Task]
    F -->|100MB超過| H[FileTooLarge]
    G -->|タスク実行| I[ECS Fargate Task]
    I -->|S3からCSV取得| B
    I -->|データ処理| J[(Database)]
    I -->|成功| K[SendSuccessNotification]
    I -->|失敗| L[SendFailureNotification]
    K -->|通知送信| M[SNS Topic]
    L -->|エラー通知| M
    M -->|メール/SMS| N[管理者]
    H --> O[Fail State]
    L --> O
```

## Step Functions ワークフロー詳細

```mermaid
stateDiagram-v2
    [*] --> ValidateS3Event
    ValidateS3Event --> CheckFileSize
    
    CheckFileSize --> FileTooLarge: fileSize > 100MB
    CheckFileSize --> RunECSTask: fileSize <= 100MB
    
    RunECSTask --> SendSuccessNotification: タスク成功
    RunECSTask --> SendFailureNotification: タスク失敗
    
    SendSuccessNotification --> [*]
    SendFailureNotification --> ImportFailed
    FileTooLarge --> [*]
    ImportFailed --> [*]
    
    note right of RunECSTask
        ECS Fargateタスクを同期実行
        - CSVダウンロード
        - データ解析
        - DB挿入
    end note
    
    note right of SendSuccessNotification
        SNS経由で成功通知
    end note
```

## ECS タスク内部処理フロー

```mermaid
flowchart TD
    Start[ECSタスク起動] --> Init[環境変数読み込み]
    Init --> Connect[DBコネクション確立]
    Connect --> Download[S3からCSVダウンロード]
    Download --> Stream[ストリーム処理開始]
    
    Stream --> Parse[CSV行をパース]
    Parse --> Buffer{バッファサイズ<br/>1000件?}
    Buffer -->|No| Parse
    Buffer -->|Yes| Insert[バッチINSERT実行]
    Insert --> Commit{トランザクション<br/>成功?}
    Commit -->|Yes| Continue{CSV終了?}
    Commit -->|No| Rollback[ロールバック]
    Rollback --> Error[エラー終了]
    
    Continue -->|No| Parse
    Continue -->|Yes| Final[残データ処理]
    Final --> Close[DB接続クローズ]
    Close --> Success[正常終了]
    
    Success --> End[タスク終了: exit 0]
    Error --> FailEnd[タスク終了: exit 1]
```

## データフロー

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant S3 as S3 Bucket
    participant EB as EventBridge
    participant SF as Step Functions
    participant ECS as ECS Task
    participant DB as Database
    participant SNS as SNS Topic
    
    User->>S3: CSVアップロード
    S3->>EB: Object Created Event
    EB->>SF: ワークフロー開始
    SF->>SF: ファイル検証
    SF->>ECS: RunTask (同期実行)
    
    activate ECS
    ECS->>S3: GetObject (CSV取得)
    S3-->>ECS: CSVストリーム
    
    loop バッチ処理 (1000件ごと)
        ECS->>ECS: CSV行パース
        ECS->>DB: BEGIN TRANSACTION
        ECS->>DB: INSERT/UPDATE
        ECS->>DB: COMMIT
    end
    
    ECS-->>SF: タスク完了
    deactivate ECS
    
    SF->>SNS: 成功通知
    SNS->>User: メール/SMS通知
```

## エラーハンドリングフロー

```mermaid
graph TD
    A[処理開始] --> B{エラー発生?}
    B -->|No| C[正常終了]
    B -->|Yes| D{エラー種類}
    
    D -->|ファイルサイズ超過| E[FileTooLarge State]
    D -->|CSV形式エラー| F[ValidationError]
    D -->|DB接続エラー| G[ConnectionError]
    D -->|その他| H[GeneralError]
    
    E --> I[失敗通知]
    F --> J[Retry 3回]
    J --> K{成功?}
    K -->|Yes| C
    K -->|No| I
    
    G --> L[Exponential Backoff<br/>Retry]
    L --> M{成功?}
    M -->|Yes| C
    M -->|No| I
    
    H --> I
    I --> N[SNS通知]
    N --> O[ログ記録]
    O --> P[ワークフロー終了]
    
    C --> Q[成功通知]
    Q --> P
```

## IAMロールと権限フロー

```mermaid
graph LR
    A[EventBridge] -->|AssumeRole| B[EventBridge Role]
    B -->|StartExecution| C[Step Functions]
    
    C -->|AssumeRole| D[Step Functions<br/>Execution Role]
    D -->|RunTask| E[ECS Task]
    D -->|PassRole| F[ECS Task Role]
    D -->|Publish| G[SNS Topic]
    
    E -->|AssumeRole| H[ECS Task<br/>Execution Role]
    E -->|AssumeRole| F
    
    H -->|Pull Image| I[ECR]
    H -->|GetLogs| J[CloudWatch Logs]
    
    F -->|GetObject| K[S3 Bucket]
    F -->|GetSecretValue| L[Secrets Manager]
    F -->|Query| M[(Database)]
    
    style B fill:#e1f5ff
    style D fill:#e1f5ff
    style F fill:#e1f5ff
    style H fill:#e1f5ff
```

## コスト最適化の考慮点

```mermaid
mindmap
  root((コスト最適化))
    Step Functions
      Express ワークフロー検討
      ステート遷移数の削減
    ECS
      Spot Instances 利用
      適切なCPU/メモリサイズ
      タスク実行時間の最小化
    S3
      ライフサイクルポリシー
      処理済みファイルの自動削除
    データベース
      バッチINSERTでクエリ数削減
      コネクションプーリング
    通知
      重要な通知のみSNS利用
      CloudWatch Logsで十分な場合も
```

## システム監視ダッシュボード構成

```mermaid
graph TB
    subgraph "CloudWatch Dashboard"
        A[Step Functions<br/>実行メトリクス]
        B[ECS Task<br/>メトリクス]
        C[S3 Object<br/>カウント]
        D[Database<br/>接続数]
        E[エラー率]
        F[処理時間]
    end
    
    subgraph "アラーム設定"
        G[実行失敗率 > 10%]
        H[処理時間 > 30分]
        I[DB接続エラー]
    end
    
    A --> G
    B --> H
    D --> I
    
    G --> J[SNS Alert]
    H --> J
    I --> J
    J --> K[オンコール担当者]
```

---

## 使用方法

このMarkdownファイルは、Mermaid記法を使用しています。以下の環境で図を表示できます：

- **GitHub**: 自動的にレンダリング
- **VS Code**: Mermaid拡張機能をインストール
- **Notion**: Mermaidブロックにコピー
- **Confluence**: Mermaid Diagramマクロを使用
- **オンライン**: https://mermaid.live/ でプレビュー

## 各図の説明

1. **システム全体のフロー**: エンドツーエンドの処理の流れ
2. **Step Functions ワークフロー詳細**: ステートマシンの状態遷移
3. **ECS タスク内部処理フロー**: CSVインポート処理の詳細
4. **データフロー**: コンポーネント間の通信シーケンス
5. **エラーハンドリングフロー**: エラー発生時の処理分岐
6. **IAMロールと権限フロー**: 各サービスの権限関係
7. **コスト最適化の考慮点**: コスト削減のポイント
8. **システム監視ダッシュボード構成**: 監視項目とアラート設定
