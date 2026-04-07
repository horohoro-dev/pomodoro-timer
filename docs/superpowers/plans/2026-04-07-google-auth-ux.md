# Google認証 + UXフロー 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Google OAuth認証（個人情報DB保存なし）とタイマー直行型UXを実装する

**Architecture:** Auth.js v5をAdapter不使用のJWT-only戦略で構成。Google sub IDでユーザー識別し、アバター・名前はJWTのみに保持。初回アクセス判定はcookieベースでmiddlewareがサーバーサイドリダイレクト。`(app)`ルートグループでヘッダー付きページとヘッダーなしページ（/welcome）を分離。

**Tech Stack:** Next.js 16 (App Router), Auth.js v5 (next-auth@5.0.0-beta.30), Drizzle ORM, Tailwind CSS v4, next-intl, Vitest

**Spec:** `docs/superpowers/specs/2026-04-07-google-auth-ux-design.md`

---

## ファイル構成

### レイアウト構造

```
src/app/
├── layout.tsx              ← ルートレイアウト（Providers のみ、ヘッダーなし）
├── providers.tsx           ← SessionProvider + NextIntlClientProvider
├── welcome/
│   ├── page.tsx            ← ウェルカムページ（ヘッダーなし）
│   ├── actions.ts          ← cookie設定Server Action
│   └── __tests__/page.test.tsx
├── (app)/
│   ├── layout.tsx          ← 既存を維持（Header + main）
│   ├── page.tsx            ← タイマー画面（/ にマッピング）★新規
│   ├── timer/page.tsx      ← / へリダイレクト（後方互換）★変更
│   └── dashboard/page.tsx  ← 既存を修正（リダイレクト先変更）
└── api/auth/[...nextauth]/route.ts  ← 既存のまま
```

### 新規作成

| ファイル | 責務 |
|---------|------|
| `src/app/providers.tsx` | SessionProvider + NextIntlClientProvider ラッパー |
| `src/app/(app)/page.tsx` | タイマー画面（`/`にマッピング） |
| `src/app/welcome/page.tsx` | ウェルカムページ（初回ログイン選択） |
| `src/app/welcome/actions.ts` | ゲスト選択時のcookie設定Server Action |
| `src/app/welcome/__tests__/page.test.tsx` | ウェルカムページのテスト |
| `src/components/layout/user-menu.tsx` | ヘッダー内ユーザーメニュー |
| `src/components/layout/__tests__/user-menu.test.tsx` | ユーザーメニューのテスト |
| `src/lib/__tests__/auth-helpers.test.ts` | ensureUserExistsのテスト |
| `src/__tests__/middleware.test.ts` | ミドルウェアのテスト |

### 変更

| ファイル | 変更内容 |
|---------|---------|
| `src/db/schema.ts` | usersテーブルをidのみに、accounts/sessions/verificationTokens削除 |
| `src/auth.ts` | DrizzleAdapter削除、JWT-onlyコールバック実装 |
| `src/lib/auth-helpers.ts` | ensureUserExists追加 |
| `middleware.ts` | cookie判定 + 認証チェック統合 |
| `src/app/layout.tsx` | Providers導入、ヘッダー削除（`(app)/layout.tsx`に委譲） |
| `src/app/(app)/timer/page.tsx` | `/`へのリダイレクトに変更 |
| `src/app/(app)/dashboard/page.tsx` | リダイレクト先を`/welcome`に変更 |
| `src/components/layout/header.tsx` | UserMenu追加、条件付きダッシュボードリンク |
| `messages/ja.json` | welcome/authメッセージ追加 |
| `messages/en.json` | welcome/authメッセージ追加 |

### 削除候補（実装後にユーザーが手動削除）

| ファイル | 理由 |
|---------|------|
| `src/app/page.tsx` | タイマーが`(app)/page.tsx`に移動するため |

### アンインストール

| パッケージ | 理由 |
|-----------|------|
| `@auth/drizzle-adapter` | Adapter不使用のため |

---

## Task 1: DBスキーマ変更

**Files:**
- Modify: `src/db/schema.ts`

- [ ] **Step 1: スキーマを更新**

`src/db/schema.ts`を以下に書き換える:

```typescript
import {
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// ==========================================
// ユーザーテーブル（idのみ、個人情報なし）
// ==========================================

export const users = pgTable("user", {
  id: text("id").primaryKey(),
});

// ==========================================
// ポモドーロセッションテーブル
// ==========================================

export const pomodoroSessions = pgTable("pomodoro_session", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  startTime: timestamp("start_time", { mode: "date" }).notNull(),
  endTime: timestamp("end_time", { mode: "date" }),
  duration: integer("duration").notNull(),
  type: text("type", { enum: ["work", "break"] }).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});
```

- [ ] **Step 2: @auth/drizzle-adapterアンインストール**

```bash
pnpm remove @auth/drizzle-adapter
```

- [ ] **Step 3: マイグレーション生成・適用**

```bash
pnpm db:generate
pnpm db:push
```

Expected: Neon developブランチにスキーマが反映される

- [ ] **Step 4: コミット**

```bash
git add src/db/schema.ts package.json pnpm-lock.yaml drizzle/
git commit -m "refactor: usersテーブルをidのみに簡素化、不要テーブル削除"
```

---

## Task 2: Auth.js設定変更（Adapter不使用JWT-only）

**Files:**
- Modify: `src/auth.ts`
- Modify: `src/lib/auth-helpers.ts`
- Test: `src/lib/__tests__/auth-helpers.test.ts`

- [ ] **Step 1: テストを書く（ensureUserExists）**

`src/lib/__tests__/auth-helpers.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// dbモジュールをモック
vi.mock("@/db", () => ({
  db: {
    insert: vi.fn(),
  },
}));

// schemaモジュールをモック
vi.mock("@/db/schema", () => ({
  users: { id: "id" },
}));

describe("ensureUserExists", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("INSERT + onConflictDoNothingでユーザーを作成する", async () => {
    const { db } = await import("@/db");
    const mockOnConflict = vi.fn().mockResolvedValue(undefined);
    const mockValues = vi.fn().mockReturnValue({
      onConflictDoNothing: mockOnConflict,
    });
    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({
      values: mockValues,
    });

    const { ensureUserExists } = await import("@/lib/auth-helpers");
    await ensureUserExists("google-sub-123");

    expect(db.insert).toHaveBeenCalled();
    expect(mockValues).toHaveBeenCalledWith({ id: "google-sub-123" });
    expect(mockOnConflict).toHaveBeenCalled();
  });

  it("DB障害時はエラーがそのまま伝播する", async () => {
    const { db } = await import("@/db");
    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockRejectedValue(new Error("DB error")),
      }),
    });

    const { ensureUserExists } = await import("@/lib/auth-helpers");
    await expect(ensureUserExists("google-sub-123")).rejects.toThrow(
      "DB error",
    );
  });
});
```

- [ ] **Step 2: テスト実行して失敗を確認**

```bash
pnpm test src/lib/__tests__/auth-helpers.test.ts
```

Expected: FAIL（`ensureUserExists`が未定義）

- [ ] **Step 3: auth-helpers.tsを更新**

`src/lib/auth-helpers.ts`:

```typescript
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";

// サーバーコンポーネント用: 現在のユーザー情報を取得する
export async function getCurrentUser() {
  const session = await auth();

  if (!session?.user) {
    return null;
  }

  return session.user;
}

// サインイン時にユーザーレコードが存在しなければ作成する
// INSERT + onConflictDoNothingで冪等。SELECT不要（TOCTOU競合回避）
export async function ensureUserExists(googleSubId: string) {
  await db.insert(users).values({ id: googleSubId }).onConflictDoNothing();
}
```

- [ ] **Step 4: テスト実行してパスを確認**

```bash
pnpm test src/lib/__tests__/auth-helpers.test.ts
```

Expected: PASS

- [ ] **Step 5: auth.tsを更新**

`src/auth.ts`:

```typescript
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { ensureUserExists } from "@/lib/auth-helpers";

// Auth.js v5 設定（Adapter不使用、JWT-only）
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ profile }) {
      // 初回サインイン時にusersテーブルにidのみINSERT
      // DB障害時はサインインを拒否（データ不整合防止）
      if (profile?.sub) {
        await ensureUserExists(profile.sub);
      }
      return true;
    },
    jwt({ token, profile }) {
      // サインイン時（profileが存在する時）のみ実行される
      // profile.subはGoogleの安定したユーザーID
      // 注意: user.idはランダムUUIDなので使わない
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

- [ ] **Step 6: APIルート確認**

`src/app/api/auth/[...nextauth]/route.ts`は既存のまま。
`@auth/drizzle-adapter`のimportが残っていないことを確認する。

- [ ] **Step 7: 型チェック**

```bash
pnpm tsc --noEmit
```

Expected: エラーなし

- [ ] **Step 8: コミット**

```bash
git add src/auth.ts src/lib/auth-helpers.ts src/lib/__tests__/auth-helpers.test.ts
git commit -m "feat: Auth.js JWT-only設定、ensureUserExistsヘルパー追加"
```

---

## Task 3: ミドルウェア（cookie判定 + 認証チェック）

**Files:**
- Modify: `middleware.ts`
- Test: `src/__tests__/middleware.test.ts`

- [ ] **Step 1: テストを書く**

`src/__tests__/middleware.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

// NextResponseをモック
vi.mock("next/server", () => {
  const mockCookiesSet = vi.fn();
  return {
    NextResponse: {
      next: vi.fn(() => ({
        cookies: { set: mockCookiesSet },
      })),
      redirect: vi.fn((url: URL) => ({
        type: "redirect",
        url: url.toString(),
        cookies: { set: mockCookiesSet },
      })),
    },
  };
});

// auth関数をモック（middlewareラッパーをバイパスしてコールバックを直接テスト）
vi.mock("@/auth", () => ({
  auth: vi.fn((handler: Function) => handler),
}));

// ミドルウェアのロジックを関数として抽出してテストする
// 実際のテストではmiddleware関数を直接importしてreqオブジェクトを渡す
function createMockReq({
  pathname,
  hasVisitedCookie,
  isAuthenticated,
}: {
  pathname: string;
  hasVisitedCookie?: boolean;
  isAuthenticated?: boolean;
}) {
  return {
    nextUrl: {
      pathname,
      origin: "http://localhost:3000",
    },
    cookies: {
      get: vi.fn((name: string) =>
        name === "hasVisited" && hasVisitedCookie
          ? { value: "true" }
          : undefined,
      ),
    },
    auth: isAuthenticated ? { user: { id: "test" } } : null,
  };
}

describe("middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("/ + 未訪問 + 未認証 → /welcomeにリダイレクト", async () => {
    const middleware = (await import("@/../../middleware")).default;
    const req = createMockReq({
      pathname: "/",
      hasVisitedCookie: false,
      isAuthenticated: false,
    });

    const result = middleware(req as any);
    expect(NextResponse.redirect).toHaveBeenCalled();
    expect(result.url).toContain("/welcome");
  });

  it("/ + 訪問済み + 未認証 → そのまま表示", async () => {
    vi.resetModules();
    const middleware = (await import("@/../../middleware")).default;
    const req = createMockReq({
      pathname: "/",
      hasVisitedCookie: true,
      isAuthenticated: false,
    });

    middleware(req as any);
    expect(NextResponse.redirect).not.toHaveBeenCalled();
    expect(NextResponse.next).toHaveBeenCalled();
  });

  it("/welcome + 認証済み → /にリダイレクト", async () => {
    vi.resetModules();
    const middleware = (await import("@/../../middleware")).default;
    const req = createMockReq({
      pathname: "/welcome",
      hasVisitedCookie: false,
      isAuthenticated: true,
    });

    const result = middleware(req as any);
    expect(result.url).toContain("http://localhost:3000/");
    expect(result.url).not.toContain("/welcome");
  });

  it("/dashboard + 未認証 → /welcomeにリダイレクト", async () => {
    vi.resetModules();
    const middleware = (await import("@/../../middleware")).default;
    const req = createMockReq({
      pathname: "/dashboard",
      hasVisitedCookie: true,
      isAuthenticated: false,
    });

    const result = middleware(req as any);
    expect(result.url).toContain("/welcome");
  });

  it("/dashboard/sub + 未認証 → /welcomeにリダイレクト", async () => {
    vi.resetModules();
    const middleware = (await import("@/../../middleware")).default;
    const req = createMockReq({
      pathname: "/dashboard/settings",
      hasVisitedCookie: true,
      isAuthenticated: false,
    });

    const result = middleware(req as any);
    expect(result.url).toContain("/welcome");
  });

  it("認証済み + hasVisited未設定 → cookieを設定", async () => {
    vi.resetModules();
    const middleware = (await import("@/../../middleware")).default;
    const req = createMockReq({
      pathname: "/",
      hasVisitedCookie: false,
      isAuthenticated: true,
    });

    const result = middleware(req as any);
    expect(result.cookies.set).toHaveBeenCalledWith(
      "hasVisited",
      "true",
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
      }),
    );
  });
});
```

- [ ] **Step 2: テスト実行して失敗を確認**

```bash
pnpm test src/__tests__/middleware.test.ts
```

Expected: FAIL（ミドルウェアが旧ロジック）

- [ ] **Step 3: middleware.tsを更新**

`middleware.ts`:

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/auth";

const COOKIE_NAME = "hasVisited";

// Auth.js v5 ミドルウェア
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const hasVisited = req.cookies.get(COOKIE_NAME)?.value === "true";
  const isAuthenticated = !!req.auth;

  // 認証済みユーザーには常にhasVisited cookieを設定
  // OAuth callbackから戻った直後のリクエストでもJWTセッションは有効
  if (isAuthenticated && !hasVisited) {
    const response = NextResponse.next();
    response.cookies.set(COOKIE_NAME, "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365 * 10, // 10年
    });
    return response;
  }

  // /welcome: 認証済みならタイマーへリダイレクト
  if (pathname === "/welcome") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/", req.nextUrl.origin));
    }
    return NextResponse.next();
  }

  // /: 初回訪問ならウェルカムへリダイレクト
  if (pathname === "/" && !hasVisited && !isAuthenticated) {
    return NextResponse.redirect(new URL("/welcome", req.nextUrl.origin));
  }

  // /dashboard: 未認証ならウェルカムへリダイレクト
  if (pathname.startsWith("/dashboard") && !isAuthenticated) {
    const welcomeUrl = new URL("/welcome", req.nextUrl.origin);
    welcomeUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(welcomeUrl);
  }

  return NextResponse.next();
});

// ミドルウェアを適用するパスの設定
export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.).*)"],
};
```

- [ ] **Step 4: テスト実行してパスを確認**

```bash
pnpm test src/__tests__/middleware.test.ts
```

Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add middleware.ts src/__tests__/middleware.test.ts
git commit -m "feat: cookie判定+認証チェック統合ミドルウェア（テスト付き）"
```

---

## Task 4: Providersラッパー + ルートレイアウト変更

**Files:**
- Create: `src/app/providers.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Providersコンポーネント作成**

`src/app/providers.tsx`:

```typescript
"use client";

import { SessionProvider } from "next-auth/react";
import { NextIntlClientProvider } from "next-intl";

// ルートレイアウト用プロバイダーラッパー
export function Providers({
  children,
  messages,
}: {
  children: React.ReactNode;
  messages: Record<string, unknown>;
}) {
  return (
    <SessionProvider>
      <NextIntlClientProvider messages={messages}>
        {children}
      </NextIntlClientProvider>
    </SessionProvider>
  );
}
```

- [ ] **Step 2: ルートレイアウト更新（ヘッダーなし）**

`src/app/layout.tsx` — ヘッダーは`(app)/layout.tsx`に委譲するため、ここには含めない:

```typescript
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getLocale, getMessages } from "next-intl/server";
import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pomodoro Timer",
  description: "ポモドーロ・テクニックで集中力と生産性を高めるタイマーアプリ",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers messages={messages as Record<string, unknown>}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
```

注: `(app)/layout.tsx`は既存のまま維持（Header + main）。`/welcome`は`(app)`の外なのでヘッダーが表示されない。

- [ ] **Step 3: 型チェック**

```bash
pnpm tsc --noEmit
```

Expected: エラーなし

- [ ] **Step 4: コミット**

```bash
git add src/app/providers.tsx src/app/layout.tsx
git commit -m "feat: SessionProvider導入、ルートレイアウトからヘッダー分離"
```

---

## Task 5: ルーティング変更（タイマー直行）

**Files:**
- Create: `src/app/(app)/page.tsx`
- Modify: `src/app/(app)/timer/page.tsx`
- Modify: `src/app/(app)/dashboard/page.tsx`

- [ ] **Step 1: `(app)/page.tsx`にタイマー画面を作成**

`src/app/(app)/page.tsx` — 現在の`src/app/(app)/timer/page.tsx`のコンテンツをコピー:

```typescript
/**
 * トップページ（タイマー画面）
 *
 * ポモドーロタイマーのメイン画面。タイマー表示・コントロール・ステータスを
 * 中央に配置し、idle時に右端の⚙アイコンから設定ドロワーを開ける。
 * タイマー実行中は1秒間隔でtickを発火し、開始時にドロワーを自動で閉じる。
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { TimerControls } from "@/components/timer/timer-controls";
import { TimerDisplay } from "@/components/timer/timer-display";
import { TimerSettings } from "@/components/timer/timer-settings";
import { TimerStatus } from "@/components/timer/timer-status";
import { useTimerStore } from "@/stores/timer-store";

// タイマーページ
export default function TimerPage() {
  const isRunning = useTimerStore((s) => s.isRunning);
  const phase = useTimerStore((s) => s.phase);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // タイマー実行中は毎秒 tick を呼ぶ
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        useTimerStore.getState().tick();
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  // タイマー開始時にドロワーを閉じる
  useEffect(() => {
    if (phase !== "idle") setIsSettingsOpen(false);
  }, [phase]);

  const isIdle = phase === "idle";

  return (
    <div className="relative flex flex-1">
      {/* タイマーメインエリア */}
      <div className="flex flex-1 flex-col items-center justify-center gap-7 px-4 py-16">
        <TimerStatus />
        <TimerDisplay />
        <TimerControls />
      </div>

      {/* 設定アイコン（idle時のみ） */}
      {isIdle && !isSettingsOpen && (
        <button
          type="button"
          onClick={() => setIsSettingsOpen(true)}
          aria-label="設定を開く"
          className="absolute right-4 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
        >
          ⚙
        </button>
      )}

      {/* 設定ドロワー */}
      <TimerSettings
        isOpen={isIdle && isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
```

- [ ] **Step 2: `/timer`を`/`へリダイレクトに変更**

`src/app/(app)/timer/page.tsx`:

```typescript
import { redirect } from "next/navigation";

// /timer → / にリダイレクト（後方互換）
export default function TimerRedirect() {
  redirect("/");
}
```

- [ ] **Step 3: ダッシュボードのリダイレクト先を修正**

`src/app/(app)/dashboard/page.tsx`:

```typescript
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth-helpers";

// ダッシュボードページ（サーバーコンポーネント）
export default async function DashboardPage() {
  const user = await getCurrentUser();
  const t = await getTranslations("dashboard");

  // 未認証ユーザーはウェルカムページへリダイレクト
  if (!user) {
    redirect("/welcome");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="flex max-w-md flex-col items-center gap-6 text-center">
        <h1 className="text-3xl font-bold text-foreground">{t("title")}</h1>
        <p className="text-muted-foreground">{t("placeholder")}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 型チェック**

```bash
pnpm tsc --noEmit
```

Expected: エラーなし

- [ ] **Step 5: コミット**

```bash
git add src/app/\(app\)/page.tsx src/app/\(app\)/timer/page.tsx src/app/\(app\)/dashboard/page.tsx
git commit -m "feat: /をタイマー直行に変更、/timerをリダイレクトに"
```

---

## Task 6: i18nメッセージ追加

**Files:**
- Modify: `messages/ja.json`
- Modify: `messages/en.json`

- [ ] **Step 1: 日本語メッセージ追加**

`messages/ja.json`に`welcome`キーを追加、`auth`キーを更新:

```json
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
```

- [ ] **Step 2: 英語メッセージ追加**

`messages/en.json`に`welcome`キーを追加、`auth`キーを更新:

```json
"welcome": {
  "title": "Welcome to Pomodoro Timer",
  "subtitle": "Boost your productivity with focused work and rest cycles",
  "loginWithGoogle": "Login with Google",
  "continueAsGuest": "Continue as Guest",
  "guestNote": "Guest mode only supports the timer. Login is required to track your work history."
},
"auth": {
  "loginWith": "Login with {provider}",
  "loginRequired": "Login required",
  "guest": "Guest",
  "logout": "Logout",
  "loginWithGoogle": "Login with Google"
}
```

- [ ] **Step 3: コミット**

```bash
git add messages/ja.json messages/en.json
git commit -m "feat: ウェルカムページ・認証関連のi18nメッセージ追加"
```

---

## Task 7: ウェルカムページ

**Files:**
- Create: `src/app/welcome/page.tsx`
- Create: `src/app/welcome/actions.ts`
- Test: `src/app/welcome/__tests__/page.test.tsx`

- [ ] **Step 1: テストを書く**

`src/app/welcome/__tests__/page.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

// next-intlモック
vi.mock("next-intl", () => ({
  useTranslations: (ns: string) => (key: string) => `${ns}.${key}`,
}));

// next-auth/reactモック
const mockSignIn = vi.fn();
vi.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
}));

// Server Actionモック
const mockSetHasVisitedCookie = vi.fn();
vi.mock("../actions", () => ({
  setHasVisitedCookie: () => mockSetHasVisitedCookie(),
}));

// next/navigationモック
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

import WelcomePage from "../page";

describe("WelcomePage", () => {
  it("アプリ名・タイトル・サブタイトルが表示される", () => {
    render(<WelcomePage />);
    expect(screen.getByText("common.appName")).toBeInTheDocument();
    expect(screen.getByText("welcome.title")).toBeInTheDocument();
    expect(screen.getByText("welcome.subtitle")).toBeInTheDocument();
  });

  it("GoogleログインボタンをクリックするとsignInが呼ばれる", async () => {
    const user = userEvent.setup();
    render(<WelcomePage />);

    await user.click(screen.getByText("welcome.loginWithGoogle"));
    expect(mockSignIn).toHaveBeenCalledWith("google", { callbackUrl: "/" });
  });

  it("ゲストボタンをクリックするとcookie設定される", async () => {
    const user = userEvent.setup();
    render(<WelcomePage />);

    await user.click(screen.getByText("welcome.continueAsGuest"));
    expect(mockSetHasVisitedCookie).toHaveBeenCalled();
  });

  it("ゲストモードの説明が表示される", () => {
    render(<WelcomePage />);
    expect(screen.getByText("welcome.guestNote")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: テスト実行して失敗を確認**

```bash
pnpm test src/app/welcome/__tests__/page.test.tsx
```

Expected: FAIL（ファイルが存在しない）

- [ ] **Step 3: Server Action作成**

`src/app/welcome/actions.ts`:

```typescript
"use server";

import { cookies } from "next/headers";

// ゲスト選択時にhasVisited cookieを設定するServer Action
export async function setHasVisitedCookie() {
  const cookieStore = await cookies();
  cookieStore.set("hasVisited", "true", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365 * 10, // 10年
  });
}
```

- [ ] **Step 4: ウェルカムページ作成**

`src/app/welcome/page.tsx`:

```typescript
"use client";

import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { setHasVisitedCookie } from "./actions";

// ウェルカムページ: 初回アクセス時のログイン選択画面
export default function WelcomePage() {
  const t = useTranslations("welcome");
  const tc = useTranslations("common");
  const router = useRouter();

  // Googleでログイン
  const handleGoogleLogin = () => {
    signIn("google", { callbackUrl: "/" });
  };

  // ゲストで始める
  const handleGuest = async () => {
    await setHasVisitedCookie();
    router.push("/");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="flex max-w-md flex-col items-center gap-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          {tc("appName")}
        </h1>
        <p className="text-lg text-muted-foreground">{t("title")}</p>
        <p className="text-muted-foreground">{t("subtitle")}</p>

        <div className="flex w-full flex-col gap-3">
          {/* Googleでログイン */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {t("loginWithGoogle")}
          </button>

          {/* ゲストで始める */}
          <button
            type="button"
            onClick={handleGuest}
            className="inline-flex h-12 w-full items-center justify-center rounded-md border border-border bg-background px-8 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            {t("continueAsGuest")}
          </button>
        </div>

        <p className="text-xs text-muted-foreground">{t("guestNote")}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: テスト実行してパスを確認**

```bash
pnpm test src/app/welcome/__tests__/page.test.tsx
```

Expected: PASS

- [ ] **Step 6: format & lint**

```bash
pnpm format && pnpm lint
```

- [ ] **Step 7: コミット**

```bash
git add src/app/welcome/
git commit -m "feat: ウェルカムページ（Google/ゲスト選択）追加"
```

---

## Task 8: ヘッダーにユーザーメニュー追加

**Files:**
- Create: `src/components/layout/user-menu.tsx`
- Test: `src/components/layout/__tests__/user-menu.test.tsx`
- Modify: `src/components/layout/header.tsx`

- [ ] **Step 1: テストを書く**

`src/components/layout/__tests__/user-menu.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

// next-intlモック
vi.mock("next-intl", () => ({
  useTranslations: (ns: string) => (key: string) => `${ns}.${key}`,
}));

// next-auth/reactモック
const mockSignIn = vi.fn();
const mockSignOut = vi.fn();
let mockSessionData: { data: unknown; status: string } = {
  data: null,
  status: "unauthenticated",
};

vi.mock("next-auth/react", () => ({
  useSession: () => mockSessionData,
  signIn: (...args: unknown[]) => mockSignIn(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));

import { UserMenu } from "../user-menu";

describe("UserMenu", () => {
  beforeEach(() => {
    mockSignIn.mockReset();
    mockSignOut.mockReset();
  });

  it("未認証時はデフォルトアイコンを表示する", () => {
    mockSessionData = { data: null, status: "unauthenticated" };
    render(<UserMenu />);
    expect(screen.getByLabelText("auth.guest")).toBeInTheDocument();
  });

  it("未認証時にクリックするとログインボタンが表示される", async () => {
    mockSessionData = { data: null, status: "unauthenticated" };
    const user = userEvent.setup();
    render(<UserMenu />);

    await user.click(screen.getByLabelText("auth.guest"));
    expect(screen.getByText("auth.loginWithGoogle")).toBeInTheDocument();
  });

  it("ログインボタンをクリックするとsignInが呼ばれる", async () => {
    mockSessionData = { data: null, status: "unauthenticated" };
    const user = userEvent.setup();
    render(<UserMenu />);

    await user.click(screen.getByLabelText("auth.guest"));
    await user.click(screen.getByText("auth.loginWithGoogle"));
    expect(mockSignIn).toHaveBeenCalledWith("google");
  });

  it("認証済み時はアバター画像を表示する", () => {
    mockSessionData = {
      data: {
        user: { name: "Test User", image: "https://example.com/avatar.jpg" },
      },
      status: "authenticated",
    };
    render(<UserMenu />);
    const img = screen.getByAltText("Test User");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/avatar.jpg");
  });

  it("認証済み時にクリックするとログアウトボタンが表示される", async () => {
    mockSessionData = {
      data: { user: { name: "Test User", image: null } },
      status: "authenticated",
    };
    const user = userEvent.setup();
    render(<UserMenu />);

    await user.click(screen.getByLabelText("Test User"));
    expect(screen.getByText("auth.logout")).toBeInTheDocument();
  });

  it("ログアウトボタンをクリックするとsignOutが呼ばれる", async () => {
    mockSessionData = {
      data: { user: { name: "Test User", image: null } },
      status: "authenticated",
    };
    const user = userEvent.setup();
    render(<UserMenu />);

    await user.click(screen.getByLabelText("Test User"));
    await user.click(screen.getByText("auth.logout"));
    expect(mockSignOut).toHaveBeenCalled();
  });

  it("loading時はスケルトンを表示する", () => {
    mockSessionData = { data: null, status: "loading" };
    render(<UserMenu />);
    expect(screen.getByTestId("user-menu-skeleton")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: テスト実行して失敗を確認**

```bash
pnpm test src/components/layout/__tests__/user-menu.test.tsx
```

Expected: FAIL（ファイルが存在しない）

- [ ] **Step 3: UserMenuコンポーネント作成**

`src/components/layout/user-menu.tsx`:

```typescript
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useTranslations } from "next-intl";

// ヘッダー内ユーザーメニューコンポーネント
export function UserMenu() {
  const { data: session, status } = useSession();
  const t = useTranslations("auth");
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // メニュー外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const toggleMenu = useCallback(() => setIsOpen((prev) => !prev), []);

  // ローディング中
  if (status === "loading") {
    return (
      <div
        data-testid="user-menu-skeleton"
        className="h-8 w-8 animate-pulse rounded-full bg-muted"
      />
    );
  }

  const isAuthenticated = status === "authenticated" && session?.user;
  const userName = session?.user?.name ?? t("guest");
  const userImage = session?.user?.image;

  return (
    <div ref={menuRef} className="relative">
      {/* トリガーボタン */}
      <button
        type="button"
        onClick={toggleMenu}
        aria-label={isAuthenticated ? userName : t("guest")}
        className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-border bg-muted transition-colors hover:bg-muted/80"
      >
        {isAuthenticated && userImage ? (
          <img
            src={userImage}
            alt={userName}
            className="h-full w-full object-cover"
          />
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-5 w-5 text-muted-foreground"
            aria-hidden="true"
          >
            <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
          </svg>
        )}
      </button>

      {/* ドロップダウンメニュー */}
      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-md border border-border bg-card py-1 shadow-lg">
          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => {
                signOut();
                setIsOpen(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted"
            >
              {t("logout")}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                signIn("google");
                setIsOpen(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted"
            >
              {t("loginWithGoogle")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: テスト実行してパスを確認**

```bash
pnpm test src/components/layout/__tests__/user-menu.test.tsx
```

Expected: PASS

- [ ] **Step 5: ヘッダーにUserMenuを統合**

`src/components/layout/header.tsx`を更新:

```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/styles";
import { UserMenu } from "./user-menu";

// アプリ内共通ヘッダーコンポーネント
export function Header() {
  const t = useTranslations("common");
  const pathname = usePathname();
  const { status } = useSession();
  const [isDark, setIsDark] = useState(false);

  const isAuthenticated = status === "authenticated";

  // 初期ダークモード状態を取得
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  // ダークモード切替
  const toggleDarkMode = useCallback(() => {
    const next = !isDark;
    document.documentElement.classList.toggle("dark", next);
    setIsDark(next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }, [isDark]);

  // ナビゲーションリンク定義（ダッシュボードは認証済みのみ）
  const navLinks = [
    { href: "/", label: t("timer") },
    ...(isAuthenticated
      ? [{ href: "/dashboard", label: t("dashboard") }]
      : []),
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        {/* アプリ名 */}
        <Link href="/" className="text-lg font-bold text-foreground">
          {t("appName")}
        </Link>

        {/* ナビゲーション + アクション */}
        <nav className="flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                pathname === link.href
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {link.label}
            </Link>
          ))}

          {/* ダークモード切替ボタン */}
          <button
            type="button"
            onClick={toggleDarkMode}
            className="ml-2 rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={isDark ? t("lightMode") : t("darkMode")}
          >
            {isDark ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M10 2a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 2zM10 15a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 15zM10 7a3 3 0 100 6 3 3 0 000-6zM15.657 5.404a.75.75 0 10-1.06-1.06l-1.061 1.06a.75.75 0 001.06 1.06l1.06-1.06zM6.464 14.596a.75.75 0 10-1.06-1.06l-1.06 1.06a.75.75 0 001.06 1.06l1.06-1.06zM18 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 0118 10zM5 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 015 10zM14.596 15.657a.75.75 0 001.06-1.06l-1.06-1.061a.75.75 0 10-1.06 1.06l1.06 1.06zM5.404 6.464a.75.75 0 001.06-1.06l-1.06-1.06a.75.75 0 10-1.06 1.06l1.06 1.06z" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M7.455 2.004a.75.75 0 01.26.77 7 7 0 009.958 7.967.75.75 0 011.067.853A8.5 8.5 0 116.647 1.921a.75.75 0 01.808.083z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>

          {/* ユーザーメニュー */}
          <UserMenu />
        </nav>
      </div>
    </header>
  );
}
```

- [ ] **Step 6: format & lint**

```bash
pnpm format && pnpm lint
```

- [ ] **Step 7: 全テスト実行**

```bash
pnpm test
```

Expected: 全テストPASS

- [ ] **Step 8: コミット**

```bash
git add src/components/layout/
git commit -m "feat: ヘッダーにユーザーメニュー追加（ログイン/ログアウト/アバター）"
```

---

## Task 9: 最終確認・整合性チェック

- [ ] **Step 1: 型チェック**

```bash
pnpm tsc --noEmit
```

- [ ] **Step 2: format & lint**

```bash
pnpm format && pnpm lint
```

- [ ] **Step 3: 全テスト実行**

```bash
pnpm test
```

- [ ] **Step 4: 不要ファイル一覧を報告**

以下のファイルは不要になったため、ユーザーに手動削除を依頼:

- `src/app/page.tsx` — タイマーが`(app)/page.tsx`に移動
- `src/app/(app)/timer/page.tsx` — リダイレクト専用。`(app)/page.tsx`がタイマーなので将来的に削除可能

- [ ] **Step 5: コミット**

```bash
git add -A
git commit -m "chore: format & lint修正"
```
