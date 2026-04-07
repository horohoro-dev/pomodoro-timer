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
users: id のみ
pomodoroSessions: id, user_id, start_time, end_time, duration, type, created_at （変更なし）
```

- `accounts`テーブル: DrizzleAdapter不使用のため削除
- `sessions`テーブル: JWT戦略のため削除
- `verificationTokens`テーブル: Email認証不使用のため削除
- `users`テーブル: `id`カラムのみ残し、`name`, `email`, `emailVerified`, `image`を削除

### DrizzleAdapterを使わない理由

Auth.jsのDrizzleAdapterは`users`テーブルに個人情報（name, email, image）を
自動書き込みする。これは「DBに個人情報を保存しない」要件と根本的に衝突する。

JWT戦略ではセッション管理にDBは不要。ユーザー識別にはGoogle sub IDを使い、
初回サインイン時にsignInコールバックで`users`テーブルにidのみINSERTする。
これによりAdapter層への依存がなくなり、テーブル設計が完全に自由になる。

### マイグレーション

Drizzle Kitの`db:generate` → `db:push`でNeon developブランチに適用する。

## Auth.js設定変更

### `src/auth.ts`

```typescript
export const { handlers, auth, signIn, signOut } = NextAuth({
  // adapter不使用: DBに個人情報を書かせないため
  providers: [Google({ ... })],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ profile }) {
      // 初回サインイン時にusersテーブルにidのみINSERT
      // Google sub IDをユーザーIDとして使用
      // DB障害時はサインインを拒否（データ不整合防止）
      if (profile?.sub) {
        await ensureUserExists(profile.sub);
      }
      return true;
    },
    jwt({ token, profile }) {
      // サインイン時にGoogleプロフィールからアバター・名前をJWTに載せる
      if (profile) {
        token.id = profile.sub;
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
    signIn: "/welcome",
  },
});
```

`ensureUserExists()`はDBにユーザーが存在しなければidのみINSERTするヘルパー関数。
`src/lib/auth-helpers.ts`または`src/db/queries.ts`に配置する。

**ポイント:**
- Adapter不使用 → DBに個人情報が書かれる余地がゼロ
- `profile.sub`（Google sub ID）をユーザーIDとして使用
- `token.picture`/`token.name`はJWTに保存（ブラウザcookie）、DBには書かない

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

- **cookieベース**で管理（`hasVisited=true`、`HttpOnly`, `Secure`, `SameSite=Lax`, `maxAge=10年`）
- middlewareでサーバーサイド判定し、未設定時は`/welcome`にリダイレクト（フラッシュなし）
- ウェルカムページでGoogle/ゲスト選択後にcookieを設定
- ゲスト選択時: Server Actionまたはクライアントからcookieを設定して`/`に戻る
- Google選択時: Auth.jsの`signIn("google")`を呼び、認証完了後のcallbackでcookieを設定して`/`に戻る

**localStorageではなくcookieを使う理由:**
localStorageはクライアントサイドでしか読めないため、ページが一瞬表示されてからリダイレクトされるフラッシュが発生する。
cookieはmiddlewareで読めるため、サーバーサイドでリダイレクト判定でき、フラッシュが起きない。

### 判定フロー（middleware内）

```
リクエスト受信
  ↓
cookie "hasVisited" を確認
  ↓
未設定 かつ パスが "/" → `/welcome`にリダイレクト
未設定 かつ パスが "/welcome" → そのまま表示
未設定 かつ パスが "/dashboard" → `/welcome`にリダイレクト
設定済み かつ パスが "/" → タイマー画面を表示
設定済み かつ 未認証 かつ パスが "/dashboard" → `/welcome`にリダイレクト
認証済み かつ パスが "/welcome" → `/`にリダイレクト
```

## ウェルカムページ (`/welcome`)

- アプリ名 + 簡単な説明
- 「Googleでログイン」ボタン → `signIn("google", { callbackUrl: "/" })`
- 「ゲストで始める」ボタン → cookieに`hasVisited=true`を設定 → `router.push("/")`
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

- `/`へのアクセスで`hasVisited` cookieなし → `/welcome`にリダイレクト
- `/dashboard`へのアクセスで未認証 → `/welcome`にリダイレクト
- `/welcome`へのアクセスで認証済み → `/`にリダイレクト
- Google認証成功時（signInイベント）→ `hasVisited` cookieを設定

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

- **ユニットテスト**: Auth.jsコールバック（JWT/session）のロジック、ensureUserExists
- **コンポーネントテスト**: ヘッダーのユーザーメニュー表示切り替え、ウェルカムページのボタン動作
- **ミドルウェアテスト**: cookie判定による初回リダイレクトロジック
