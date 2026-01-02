# MariaDBセットアップガイド（EC2 Amazon Linux 2023）

このドキュメントでは、EC2 Amazon Linux 2023にMariaDBをインストールし、ECSコンテナから接続できるように設定する手順を説明します。

## 前提条件

- EC2インスタンスが起動していること
- EC2インスタンスにSSH接続できること
- 管理者権限（sudo）があること

---

## ステップ1: MariaDBのインストール

### 1-1. システムの更新

```bash
sudo dnf update -y
```

### 1-2. MariaDBサーバーのインストール

Amazon Linux 2023では、MariaDBはデフォルトのリポジトリに含まれています。

```bash
sudo dnf install -y mariadb105-server
```

**注意**: バージョン番号（`105`）は、利用可能な最新バージョンに応じて変更される場合があります。利用可能なバージョンを確認するには：

```bash
dnf list available mariadb*server
```

### 1-3. MariaDBサービスの起動と有効化

```bash
# MariaDBサービスを起動
sudo systemctl start mariadb

# システム起動時に自動起動するように設定
sudo systemctl enable mariadb

# サービスの状態を確認
sudo systemctl status mariadb
```

### 1-4. 初期セキュリティ設定

MariaDBの初期セキュリティ設定を実行します：

```bash
sudo mysql_secure_installation
```

このコマンドを実行すると、以下の設定が対話形式で求められます：

1. **rootパスワードの設定**: 新しいrootパスワードを設定（またはEnterキーでスキップ）
2. **匿名ユーザーの削除**: `Y`を入力して削除
3. **リモートrootログインの禁止**: `Y`を入力して禁止（推奨）
4. **testデータベースの削除**: `Y`を入力して削除
5. **権限テーブルの再読み込み**: `Y`を入力して再読み込み

---

## ステップ2: データベースとユーザーの作成

### 2-1. MariaDBにログイン

```bash
sudo mysql -u root -p
```

rootパスワードを入力します。

### 2-2. データベースの作成

```sql
CREATE DATABASE your_database_name CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

**例**:
```sql
CREATE DATABASE express_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2-3. アプリケーション用ユーザーの作成

```sql
CREATE USER 'your_username'@'%' IDENTIFIED BY 'your_secure_password';
```

**例**:
```sql
CREATE USER 'express_user'@'%' IDENTIFIED BY 'your_secure_password_here';
```

**注意**: `'%'`は任意のホストからの接続を許可します。セキュリティを強化する場合は、ECSタスクのセキュリティグループのIPアドレス範囲を指定することもできます。

### 2-4. ユーザーに権限を付与

```sql
GRANT ALL PRIVILEGES ON your_database_name.* TO 'your_username'@'%';
FLUSH PRIVILEGES;
```

**例**:
```sql
GRANT ALL PRIVILEGES ON express_app.* TO 'express_user'@'%';
FLUSH PRIVILEGES;
```

### 2-5. MariaDBからログアウト

```sql
EXIT;
```

---

## ステップ3: MariaDBの設定（リモート接続を許可）

### 3-1. MariaDB設定ファイルの編集

```bash
sudo vi /etc/my.cnf.d/mariadb-server.cnf
```

または

```bash
sudo nano /etc/my.cnf.d/mariadb-server.cnf
```

### 3-2. bind-addressの設定

`[mysqld]`セクションに以下を追加または変更します：

```ini
[mysqld]
bind-address = 0.0.0.0
```

**注意**: 
- `0.0.0.0`はすべてのネットワークインターフェースでリッスンします
- セキュリティを強化する場合は、EC2インスタンスのプライベートIPアドレスを指定することもできます

### 3-3. MariaDBサービスの再起動

設定を反映するために、MariaDBサービスを再起動します：

```bash
sudo systemctl restart mariadb
```

### 3-4. 設定の確認

```bash
sudo systemctl status mariadb
```

---

## ステップ4: ファイアウォールの設定（Amazon Linux 2023）

Amazon Linux 2023では、デフォルトで`firewalld`が使用されます。

### 4-1. ファイアウォールサービスの確認

```bash
sudo systemctl status firewalld
```

### 4-2. ファイアウォールが有効な場合の設定

MariaDBのポート（3306）を開きます：

```bash
# ファイアウォールが有効な場合
sudo firewall-cmd --permanent --add-port=3306/tcp
sudo firewall-cmd --reload
```

### 4-3. ファイアウォールが無効な場合

セキュリティグループで制御する場合は、ファイアウォールを無効にすることもできます：

```bash
sudo systemctl stop firewalld
sudo systemctl disable firewalld
```

**注意**: セキュリティグループで適切に制御している場合は、EC2レベルでファイアウォールを無効にしても問題ありません。

---

## ステップ5: セキュリティグループの設定

ECSコンテナからMariaDBに接続できるように、AWSセキュリティグループを設定します。

### 5-1. EC2インスタンスのセキュリティグループを確認

1. **Amazon EC2コンソール**に移動
2. **インスタンス**を選択
3. MariaDBがインストールされているEC2インスタンスを選択
4. **セキュリティ**タブを確認
5. セキュリティグループ名をメモ（例: `sg-xxxxxxxxxxxxx`）

### 5-2. セキュリティグループのインバウンドルールを設定

1. **セキュリティグループ**をクリック
2. **インバウンドルール**タブを選択
3. **インバウンドルールを編集**をクリック
4. **ルールを追加**をクリック
5. 以下の設定を入力：

   **設定例1: ECSタスクのセキュリティグループからの接続を許可（推奨）**

   - **タイプ**: `MySQL/Aurora`（または`カスタムTCP`）
   - **プロトコル**: `TCP`
   - **ポート範囲**: `3306`
   - **ソース**: `カスタム`を選択し、ECSタスク用のセキュリティグループIDを選択
   - **説明**: `Allow MySQL from ECS tasks`

   **設定例2: VPC内のすべてのリソースからの接続を許可**

   - **タイプ**: `MySQL/Aurora`（または`カスタムTCP`）
   - **プロトコル**: `TCP`
   - **ポート範囲**: `3306`
   - **ソース**: `カスタム`を選択し、VPCのCIDRブロック（例: `10.0.0.0/16`）を入力
   - **説明**: `Allow MySQL from VPC`

   **設定例3: 特定のIPアドレス範囲からの接続を許可**

   - **タイプ**: `MySQL/Aurora`（または`カスタムTCP`）
   - **プロトコル**: `TCP`
   - **ポート範囲**: `3306`
   - **ソース**: `カスタム`を選択し、特定のIPアドレス範囲（例: `10.0.1.0/24`）を入力
   - **説明**: `Allow MySQL from specific subnet`

6. **ルールを保存**をクリック

### 5-3. ECSタスク用セキュリティグループの設定

ECSタスクがMariaDBに接続できるように、ECSタスク用のセキュリティグループのアウトバウンドルールを確認します。

1. **Amazon ECSコンソール**に移動
2. タスク定義またはサービスで使用されているセキュリティグループを確認
3. **Amazon VPCコンソール** → **セキュリティグループ**に移動
4. ECSタスク用のセキュリティグループを選択
5. **アウトバウンドルール**タブを確認

   デフォルトでは、すべてのアウトバウンドトラフィックが許可されているはずです。制限する場合は：

   - **タイプ**: `MySQL/Aurora`（または`カスタムTCP`）
   - **プロトコル**: `TCP`
   - **ポート範囲**: `3306`
   - **宛先**: EC2インスタンスのセキュリティグループを選択
   - **説明**: `Allow MySQL to EC2 MariaDB`

---

## ステップ6: 接続テスト

### 6-1. EC2インスタンス内からの接続テスト

EC2インスタンスにSSH接続し、ローカルから接続をテストします：

```bash
mysql -u your_username -p -h localhost your_database_name
```

### 6-2. ECSタスクからの接続テスト

ECSタスクが起動したら、CloudWatch Logsで接続エラーがないか確認します。

または、ECSタスク内で接続テストを実行：

```bash
# ECSタスクに接続（タスク実行中の場合）
# タスクの詳細から「接続」をクリック

# 接続テスト（タスク内で実行）
mysql -u your_username -p -h <EC2_PRIVATE_IP> your_database_name
```

### 6-3. アプリケーションからの接続確認

アプリケーションのログを確認して、データベース接続が成功しているか確認します。

---

## トラブルシューティング

### 接続できない場合

1. **セキュリティグループの確認**
   - EC2インスタンスのセキュリティグループで、ポート3306が開いているか確認
   - ソースが正しいセキュリティグループまたはIPアドレス範囲になっているか確認

2. **MariaDBの設定確認**
   ```bash
   # bind-addressの確認
   sudo grep bind-address /etc/my.cnf.d/mariadb-server.cnf
   
   # MariaDBがリッスンしているか確認
   sudo netstat -tlnp | grep 3306
   # または
   sudo ss -tlnp | grep 3306
   ```

3. **ファイアウォールの確認**
   ```bash
   # firewalldの状態確認
   sudo systemctl status firewalld
   
   # 開いているポートの確認
   sudo firewall-cmd --list-ports
   ```

4. **ユーザー権限の確認**
   ```bash
   sudo mysql -u root -p
   ```
   ```sql
   SELECT user, host FROM mysql.user;
   SHOW GRANTS FOR 'your_username'@'%';
   ```

5. **ネットワークの確認**
   - ECSタスクとEC2インスタンスが同じVPC内にあるか確認
   - サブネットのルーティングテーブルを確認

### パフォーマンスの問題

1. **接続プールの設定**
   - アプリケーション側で接続プールを適切に設定

2. **MariaDBの設定最適化**
   - `/etc/my.cnf.d/mariadb-server.cnf`でメモリや接続数の設定を調整

---

## セキュリティのベストプラクティス

1. **強力なパスワードを使用**
   - データベースユーザーのパスワードは強力で複雑なものにする

2. **最小権限の原則**
   - アプリケーションに必要な最小限の権限のみを付与

3. **セキュリティグループの制限**
   - 可能な限り、特定のセキュリティグループからの接続のみを許可

4. **SSL/TLS接続の使用（推奨）**
   - 本番環境では、SSL/TLS接続を使用することを推奨

5. **定期的なバックアップ**
   - データベースの定期的なバックアップを設定

6. **ログの監視**
   - MariaDBのログを監視し、異常なアクセスを検出

---

## 参考リソース

- [MariaDB公式ドキュメント](https://mariadb.com/kb/en/documentation/)
- [Amazon Linux 2023 ドキュメント](https://docs.aws.amazon.com/linux/al2023/)
- [AWSセキュリティグループ ドキュメント](https://docs.aws.amazon.com/vpc/latest/userguide/security-groups.html)
- [Amazon ECS ネットワーク設定](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-networking.html)

---

## 補足: 接続文字列の例

アプリケーションで使用する接続文字列の例：

```
mariadb://your_username:your_password@<EC2_PRIVATE_IP>:3306/your_database_name
```

**例**:
```
mariadb://express_user:secure_password@10.0.1.100:3306/express_app
```

**注意**: 
- `<EC2_PRIVATE_IP>`は、EC2インスタンスのプライベートIPアドレスに置き換えてください
- パブリックIPアドレスではなく、プライベートIPアドレスを使用することを推奨します（同じVPC内の場合）

