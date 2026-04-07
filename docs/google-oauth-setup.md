# Google OAuth セットアップ手順

Auth.js v5 で Google ログインを使うために必要な設定手順。

## 前提条件

- Google アカウント
- クレジットカード不要（OAuth 機能は完全無料）

## 1. Google Cloud プロジェクト作成

1. [Google Cloud Console](https://console.cloud.google.com/) にログイン
2. 上部のプロジェクト選択ドロップダウン → **「新しいプロジェクト」**
3. プロジェクト名を入力（例: `pomodoro-timer`）して **「作成」**

## 2. OAuth 同意画面の設定

1. 左メニュー **「Google Auth platform」 > 「Branding」** → **「Get Started」**
2. App Information:
   - **App name**: アプリ名（例: `Pomodoro Timer`）
   - **User support email**: 自分のメールアドレス
3. Audience: **「External」** を選択
4. Contact Information: 通知用メールアドレスを入力
5. 同意チェックを入れて **「Create」**

## 3. テストユーザーの追加

> Testingモード中は登録したユーザーしかログインできない。未登録だと「Access blocked」エラーになる。

1. **「Audience」** セクションに移動
2. **「Test users」** → **「Add users」**
3. テストに使う Google アカウントのメールアドレスを入力して保存

## 4. スコープの設定

1. **「Data Access」** → **「Add or Remove Scopes」**
2. 以下を選択:
   - `openid`
   - `email`
   - `profile`
3. **「Save」**

## 5. OAuth クライアント ID の作成

1. **「Clients」** → **「Create Client」**
2. **Application type**: `Web application`
3. **Name**: 識別用の名前（例: `Pomodoro Timer Web`）
4. **Authorized JavaScript origins**:
   - `http://localhost:3000`（ローカル開発用）
   - `https://your-domain.vercel.app`（本番用、デプロイ後に追加）
5. **Authorized redirect URIs**:
   - `http://localhost:3000/api/auth/callback/google`（ローカル開発用）
   - `https://your-domain.vercel.app/api/auth/callback/google`（本番用、デプロイ後に追加）
6. **「Create」**

## 6. 環境変数の設定

作成完了後に表示される Client ID と Client Secret を `.env.local` に追加:

```text
AUTH_GOOGLE_ID=xxxxxxxxxxxx.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=GOCSPX-xxxxxxxxxxxx
```

AUTH_SECRET（JWT暗号化キー）も必要。以下のコマンドで生成・追加:

```bash
npx auth secret
```

最終的な `.env.local` の内容:

```text
DATABASE_URL=postgresql://...（Neon の接続文字列）
AUTH_GOOGLE_ID=xxxxxxxxxxxx.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=GOCSPX-xxxxxxxxxxxx
AUTH_SECRET=xxxxxxxxxxxx
```

## 7. DB マイグレーション

初回のみ、スキーマを DB に反映:

```bash
pnpm db:push
```

## 8. 動作確認

```bash
pnpm dev
```

`http://localhost:3000` にアクセスし、ウェルカムページで「Google でログイン」が動作することを確認。

## よくあるエラー

| エラー | 原因 | 対処 |
|--------|------|------|
| `redirect_uri_mismatch` | リダイレクト URI が完全一致していない | Google Cloud Console で URI を確認。末尾スラッシュの有無にも注意 |
| `Access blocked` | テストユーザーに未登録 | Audience → Test users にメールアドレスを追加 |
| `AUTH_SECRET` missing | 環境変数未設定 | `npx auth secret` を実行 |

## 本番デプロイ時の追加作業

- Vercel ダッシュボードの Settings > Environment Variables に `AUTH_GOOGLE_ID`、`AUTH_GOOGLE_SECRET`、`AUTH_SECRET` を登録
- Google Cloud Console で本番ドメインを Authorized origins と redirect URI に追加
- Testing → Production に移行する場合、Google の検証プロセスが必要（プライバシーポリシー URL の設定等）
