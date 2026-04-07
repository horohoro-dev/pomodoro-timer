# Google認証 + UXフロー設計

> 作成日: 2026-04-07
> ステータス: 承認済み

## 概要

ポモドーロタイマーアプリにGoogle OAuth認証を実装する。個人情報はDB
に保存せず、JWTセッション経由でUI表示（アバター等）にのみ使用する。
アプリはタイマー直行型のUXとし、初回アクセス時のみログイン選択を表示する。

## 要件

1. DBに個人情報（name, email, image）を保存しない
2. JWTトークンにGoogleアバターURL・表示名を載せ、UI表示に使う
3. `/`でタイマー画面に直行（選択画面なし）
4. 初回アクセス時のみウェルカム画面でGoogle/ゲスト選択
5. ゲストユーザーはヘッダーUIからGoogle認証に切り替え可能
6. ログイン済みユーザーはヘッダーUIからログアウト可能
7. ダッシュボードリンクはログイン済みの場合のみヘッダーに表示

## DBスキーマ変更

### 変更前

```
users: id, name, email, emailVerified, image
accounts: userId, type, provider, providerAccountId, tokens...
sessions: sessionToken, userId, expires
verificationTokens: identifier, token, expires
pomodoroSessions: id, user_id, start_time, end_time, duration, type, created_at
```

### 変更後

```
users: id （個人情報カラム全削除）
accounts: userId, type, provider, providerAccountId, tokens... （変更なし）
pomodoroSessions: id, user_id, start_time, end_time, duration, type, created_at （変更なし）
```

- `sessions`テーブル: JWT戦略のため削除
- `verificationTokens`テーブル: Email認証不使用のため削除
- `users.name`, `users.email`, `users.emailVerified`, `users.image`: 削除

### マイグレーション

Drizzle Kitの`db:generate` → `db:push`でNeon developブランチに適用する。

## Auth.js設定変更

### `src/auth.ts`

```typescript
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  providers: [Google({ ... })],
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, user, profile }) {
      if (user) {
        token.id = user.id;
      }
      // サインイン時にGoogleプロフィールからアバター・名前をJWTに載せる
      if (profile) {
        token.picture = profile.picture;
        token.name = profile.name;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.image = token.picture as string | undefined;
        session.user.name = token.name as string | undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: "/welcome",  // カスタムサインインページ → ウェルカムページに変更
  },
});
```

**ポイント:**
- `profile`はサインイン時のみ存在（Googleから返却されたプロフィール情報）
- `token.picture`/`token.name`はJWTに保存（ブラウザcookie）、DBには書かない
- DrizzleAdapterは`users`テーブルにidのみ書き込む（カラムが存在しないため個人情報は自動的に無視される）

## ルーティング変更

| パス | 変更前 | 変更後 |
|------|--------|--------|
| `/` | ホーム選択画面（`src/app/page.tsx`） | タイマー画面（`(app)/timer`のコンテンツを移動） |
| `/timer` | タイマー画面 | `/`にリダイレクト（後方互換） |
| `/welcome` | なし | 初回ログイン選択画面（新規作成） |
| `/dashboard` | 認証必須 | 認証必須（変更なし） |
| `/auth/signin` | 未作成 | 不要（`/welcome`に統合） |

### 実装方針

- `src/app/page.tsx`: 現在のホーム選択画面 → タイマー画面に書き換え
- `src/app/(app)/timer/page.tsx`: `/`へのリダイレクトに変更
- `src/app/layout.tsx`: ヘッダーを含むレイアウトに変更（`(app)/layout.tsx`の役割を吸収）
- `src/app/(app)/layout.tsx`: 不要になる（削除候補）
- `src/app/welcome/page.tsx`: 新規作成

## 初回アクセス判定

- `localStorage`に`hasVisited`キーで管理
- クライアントコンポーネントで判定し、未設定時は`/welcome`にリダイレクト
- ウェルカムページでGoogle/ゲスト選択後に`hasVisited = "true"`を設定
- ゲスト選択時: `hasVisited`を設定して`/`に戻る
- Google選択時: Auth.jsの`signIn("google")`を呼び、認証完了後に`hasVisited`を設定して`/`に戻る

### 判定フロー

```
ユーザーが`/`にアクセス
  ↓
localStorage.getItem("hasVisited") を確認
  ↓
未設定 → `/welcome`にリダイレクト
設定済み → タイマー画面を表示
```

## ウェルカムページ (`/welcome`)

- アプリ名 + 簡単な説明
- 「Googleでログイン」ボタン → `signIn("google", { callbackUrl: "/" })`
- 「ゲストで始める」ボタン → `localStorage.setItem("hasVisited", "true")` → `router.push("/")`
- ログイン済みユーザーがアクセスした場合は`/`にリダイレクト
- ヘッダーなし（独立したページ）

## ヘッダーUI変更

### 変更内容

- 右側にユーザーメニューを追加
- ダッシュボードリンクはログイン済みの場合のみ表示
- ユーザーメニューの表示:
  - **ゲスト**: デフォルトのユーザーアイコン → クリックでドロップダウン（「Googleでログイン」）
  - **ログイン済み**: Googleアバター画像 → クリックでドロップダウン（「ログアウト」）

### セッション取得方法

ヘッダーはClient Componentのため、`next-auth/react`の`useSession()`を使用する。
`SessionProvider`をルートレイアウトに追加する。

```
layout.tsx
  └─ SessionProvider (next-auth/react)
     └─ NextIntlClientProvider
        └─ children
```

## ミドルウェア変更

### 変更前

- `/dashboard`へのアクセスで未認証 → `/auth/signin`にリダイレクト

### 変更後

- `/dashboard`へのアクセスで未認証 → `/welcome`にリダイレクト
- `/welcome`へのアクセスで認証済み → `/`にリダイレクト

## i18nメッセージ追加

`messages/ja.json` と `messages/en.json` に以下を追加:

```json
{
  "welcome": {
    "title": "ポモドーロタイマーへようこそ",
    "subtitle": "集中と休憩のリズムで生産性を高めましょう",
    "loginWithGoogle": "Googleでログイン",
    "continueAsGuest": "ゲストで始める",
    "guestNote": "ゲストモードではタイマーのみ利用できます。作業履歴の記録にはログインが必要です。"
  },
  "auth": {
    "loginWith": "{provider}でログイン",
    "loginRequired": "ログインが必要です",
    "guest": "ゲスト",
    "logout": "ログアウト",
    "loginWithGoogle": "Googleでログイン"
  }
}
```

## 不要になるファイル一覧

実装完了後にユーザーが手動削除する:

- `src/app/(app)/layout.tsx` — ルートレイアウトに統合
- `src/app/(app)/timer/page.tsx` — タイマーを`/`に移動するため

## テスト方針

- **ユニットテスト**: Auth.jsコールバック（JWT/session）のロジック
- **コンポーネントテスト**: ヘッダーのユーザーメニュー表示切り替え、ウェルカムページのボタン動作
- **初回判定ロジック**: localStorage操作のテスト
