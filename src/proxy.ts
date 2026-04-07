import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ROUTES } from "@/lib/routes";

const COOKIE_NAME = "hasVisited";

// 初回訪問判定をスキップするパス（ここに含まれないパスは全て初回判定対象）
const SKIP_FIRST_VISIT_CHECK = [ROUTES.WELCOME];

// 認証が必要なパス
const AUTH_REQUIRED_PREFIXES = [ROUTES.DASHBOARD];

// Next.js 16 プロキシ（旧middleware）
// auth()ラッパーでJWTデコード・期限チェックを行い、req.authでセッション取得
export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;
  const hasVisited = req.cookies.get(COOKIE_NAME)?.value === "true";
  const isAuthenticated = !!req.auth;

  // ウェルカムページ: 認証済みならタイマーへリダイレクト
  if (pathname === ROUTES.WELCOME) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL(ROUTES.HOME, req.nextUrl.origin));
    }
    return NextResponse.next();
  }

  // 認証済みユーザーには常にhasVisited cookieを設定
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

  // 認証が必要なパス: 未認証ならウェルカムへリダイレクト（callbackUrl付き）
  if (
    !isAuthenticated &&
    AUTH_REQUIRED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  ) {
    const welcomeUrl = new URL(ROUTES.WELCOME, req.nextUrl.origin);
    welcomeUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(welcomeUrl);
  }

  // 初回訪問ならウェルカムへリダイレクト（スキップリスト以外の全パス）
  if (
    !hasVisited &&
    !isAuthenticated &&
    !SKIP_FIRST_VISIT_CHECK.includes(pathname)
  ) {
    return NextResponse.redirect(new URL(ROUTES.WELCOME, req.nextUrl.origin));
  }

  return NextResponse.next();
});

// プロキシを適用するパスの設定
export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.).*)"],
};
