import { type NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ミドルウェアのコールバックロジックを抽出してテストする
// auth()はNextAuthのラッパーなので、コールバック関数を直接テストする

// NextResponseのモック
vi.mock("next/server", async () => {
  const actual =
    await vi.importActual<typeof import("next/server")>("next/server");
  return {
    ...actual,
    NextResponse: {
      next: vi.fn(() => ({
        cookies: {
          set: vi.fn(),
        },
      })),
      redirect: vi.fn((url: URL) => ({
        type: "redirect",
        url,
        cookies: {
          set: vi.fn(),
        },
      })),
    },
  };
});

// auth モジュールのモック: default exportがコールバックを受け取り、そのコールバックを返す
let middlewareCallback: (
  req: NextAuthRequest,
) =>
  | ReturnType<typeof NextResponse.next>
  | ReturnType<typeof NextResponse.redirect>
  | undefined;

vi.mock("@/auth", () => ({
  auth: (cb: typeof middlewareCallback) => {
    middlewareCallback = cb;
    return cb;
  },
}));

// NextAuthRequestの型（auth()が拡張するリクエスト）
interface NextAuthRequest extends NextRequest {
  auth: { user: { id: string } } | null;
}

// テスト用リクエストヘルパー
function createMockRequest(options: {
  pathname: string;
  hasVisitedCookie?: boolean;
  isAuthenticated?: boolean;
  origin?: string;
}): NextAuthRequest {
  const origin = options.origin ?? "http://localhost:3000";
  const url = new URL(options.pathname, origin);

  return {
    nextUrl: url,
    cookies: {
      get: vi.fn((name: string) => {
        if (name === "hasVisited" && options.hasVisitedCookie) {
          return { value: "true" };
        }
        return undefined;
      }),
    },
    auth: options.isAuthenticated ? { user: { id: "user-123" } } : null,
  } as unknown as NextAuthRequest;
}

describe("ミドルウェア", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // ミドルウェアモジュールを読み込み、コールバックを取得
    await import("../../middleware");
  });

  describe("初回訪問判定", () => {
    it("/ + hasVisited cookieなし + 未認証 → /welcomeへリダイレクト", () => {
      const req = createMockRequest({
        pathname: "/",
        hasVisitedCookie: false,
        isAuthenticated: false,
      });

      middlewareCallback(req);

      expect(NextResponse.redirect).toHaveBeenCalledWith(
        expect.objectContaining({
          pathname: "/welcome",
        }),
      );
    });

    it("/ + hasVisited cookieあり + 未認証 → パススルー", () => {
      const req = createMockRequest({
        pathname: "/",
        hasVisitedCookie: true,
        isAuthenticated: false,
      });

      middlewareCallback(req);

      expect(NextResponse.redirect).not.toHaveBeenCalled();
      expect(NextResponse.next).toHaveBeenCalled();
    });
  });

  describe("ウェルカムページ", () => {
    it("/welcome + 認証済み → /へリダイレクト", () => {
      const req = createMockRequest({
        pathname: "/welcome",
        hasVisitedCookie: true,
        isAuthenticated: true,
      });

      middlewareCallback(req);

      expect(NextResponse.redirect).toHaveBeenCalledWith(
        expect.objectContaining({
          pathname: "/",
        }),
      );
    });

    it("/welcome + 未認証 → パススルー", () => {
      const req = createMockRequest({
        pathname: "/welcome",
        hasVisitedCookie: false,
        isAuthenticated: false,
      });

      middlewareCallback(req);

      expect(NextResponse.redirect).not.toHaveBeenCalled();
      expect(NextResponse.next).toHaveBeenCalled();
    });
  });

  describe("ダッシュボード保護", () => {
    it("/dashboard + 未認証 → /welcomeへリダイレクト（callbackUrl付き）", () => {
      const req = createMockRequest({
        pathname: "/dashboard",
        hasVisitedCookie: false,
        isAuthenticated: false,
      });

      middlewareCallback(req);

      expect(NextResponse.redirect).toHaveBeenCalled();
      const redirectUrl = (NextResponse.redirect as ReturnType<typeof vi.fn>)
        .mock.calls[0][0] as URL;
      expect(redirectUrl.pathname).toBe("/welcome");
      expect(redirectUrl.searchParams.get("callbackUrl")).toBe("/dashboard");
    });

    it("/dashboard/sub + 未認証 → /welcomeへリダイレクト（callbackUrl付き）", () => {
      const req = createMockRequest({
        pathname: "/dashboard/sub",
        hasVisitedCookie: false,
        isAuthenticated: false,
      });

      middlewareCallback(req);

      expect(NextResponse.redirect).toHaveBeenCalled();
      const redirectUrl = (NextResponse.redirect as ReturnType<typeof vi.fn>)
        .mock.calls[0][0] as URL;
      expect(redirectUrl.pathname).toBe("/welcome");
      expect(redirectUrl.searchParams.get("callbackUrl")).toBe(
        "/dashboard/sub",
      );
    });
  });

  describe("認証済みユーザーのcookie設定", () => {
    it("認証済み + hasVisited cookieなし → cookieを設定してパススルー", () => {
      const req = createMockRequest({
        pathname: "/",
        hasVisitedCookie: false,
        isAuthenticated: true,
      });

      middlewareCallback(req);

      expect(NextResponse.next).toHaveBeenCalled();
      // NextResponse.next()の戻り値のcookies.setが呼ばれることを検証
      const mockNextResponse = (NextResponse.next as ReturnType<typeof vi.fn>)
        .mock.results[0]?.value;
      expect(mockNextResponse.cookies.set).toHaveBeenCalledWith(
        "hasVisited",
        "true",
        expect.objectContaining({
          httpOnly: true,
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 365 * 10,
        }),
      );
    });
  });
});
