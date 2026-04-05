# Pomodoro Timer Web App

カスタマイズ可能なポモドーロタイマー + 作業記録ダッシュボードのフルスタックWebアプリ。

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| フレームワーク | Next.js 16 (App Router) + TypeScript |
| CSS | Tailwind CSS v4 + tailwind-variants + tailwind-merge |
| 認証 | Auth.js v5 (Google OAuth) |
| ORM / DB | Drizzle ORM + PostgreSQL (Neon Serverless) |
| チャート | Recharts + カスタムSVGヒートマップ |
| i18n | next-intl（日本語 / 英語） |
| デプロイ | Vercel (Hobby 無料枠) |

## 機能概要

- **ポモドーロタイマー**: セットごとに作業時間・休憩時間をカスタマイズ可能。複数セットをループ
- **作業記録**: セット完了時・リセット時にDB保存。localStorage定期バックアップ
- **ダッシュボード**: GitHub風ヒートマップ、週間棒グラフ、時間帯別グラフ
- **認証**: Google OAuthログイン。ゲストはタイマーのみ利用可能
- **ダークモード / 多言語対応**: Tailwind `dark:` + next-intl（日英）

## 開発環境セットアップ

### 前提条件

- Docker / Docker Compose
- Google OAuth クレデンシャル（認証機能を使う場合）
- Neon PostgreSQL データベース（DB機能を使う場合）

### 起動方法

```bash
# コンテナビルド & 起動
docker compose up -d --build

# コンテナ内で依存関係インストール
docker compose exec app pnpm install

# 開発サーバー起動
docker compose exec app pnpm dev
```

### 環境変数

`.env.local` に以下を設定:

```bash
AUTH_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
DATABASE_URL=
```

### DBマイグレーション

```bash
pnpm db:generate   # マイグレーションファイル生成
pnpm db:migrate    # マイグレーション実行
pnpm db:push       # スキーマをDBに直接反映
pnpm db:studio     # Drizzle Studio 起動
```

## 実装進捗

### インフラ・基盤

- [x] Next.js 16 プロジェクト初期セットアップ
- [x] Tailwind CSS v4 セマンティックトークン + ダークモード設定
- [x] Drizzle ORM スキーマ + Neon PostgreSQL 設定
- [x] next-intl 日英多言語対応セットアップ
- [x] Auth.js v5 Google OAuth 認証設定
- [x] アプリレイアウト + 基本ページ構成（ヘッダー、ナビゲーション）
- [x] Docker 開発環境構築

### ポモドーロタイマー

- [ ] タイマーUI（カウントダウン表示、開始/一時停止/リセット）
- [ ] セットごとの作業時間・休憩時間カスタマイズ
- [ ] 複数セットのループ機能
- [ ] タイマー設定の localStorage 管理
- [ ] Date.now() ベースのドリフト対策
- [ ] 音声通知 + ブラウザ通知（Notification API）

### 作業記録

- [ ] セット完了時のDB保存
- [ ] リセット時の経過分DB保存
- [ ] localStorage への経過時間定期バックアップ
- [ ] ブラウザ再起動時の未保存データ確認UI
- [ ] サーバー側の時間帯重複チェック（多重タブ・別端末対策）

### ダッシュボード

- [ ] GitHub風ヒートマップ（年単位、カスタムSVG、濃淡5段階）
- [ ] 週間棒グラフ（Screen Time風、月〜日）
- [ ] 時間帯別グラフ（0〜23時）
- [ ] ホバーで詳細表示

### その他

- [ ] 言語切替UI（現在プレースホルダー）
- [ ] ゲストモード（タイマーのみ、集計なし）
- [ ] PWA 対応（将来予定）

## プロジェクト構成

```text
src/
├── app/
│   ├── (app)/           # アプリ内ページ（共通レイアウト適用）
│   │   ├── timer/       # タイマーページ
│   │   └── dashboard/   # ダッシュボードページ
│   ├── api/auth/        # Auth.js APIルート
│   ├── layout.tsx       # ルートレイアウト
│   └── page.tsx         # トップページ
├── components/
│   ├── layout/          # ヘッダー等の共通レイアウト
│   └── ui/              # 汎用UIコンポーネント
├── db/                  # Drizzle ORMスキーマ・接続
├── i18n/                # next-intl 設定
└── lib/                 # ユーティリティ
messages/                # 翻訳ファイル (ja.json, en.json)
plan/                    # 構想書
```
