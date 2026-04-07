import { NextResponse } from "next/server";
import { auth } from "@/auth";

const COOKIE_NAME = "hasVisited";

// Next.js 16 プロキシ（旧middleware）
// auth()���ッパーでJWTデコード・期限チェックを行い、req.authでセッション取得
export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;
  const hasVisited = req.cookies.get(COOKIE_NAME)?.value === "true";
  const isAuthenticated = !!req.auth;

  // /welcome: 認証済みならタイマーへリダイレクト
  if (pathname === "/welcome") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/", req.nextUrl.origin));
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

  // / または /timer: 初回訪問ならウェルカムへリダイレクト
  if (
    (pathname === "/" || pathname === "/timer") &&
    !hasVisited &&
    !isAuthenticated
  ) {
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

// プロキシを適用するパスの設定
export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.).*)"],
};
