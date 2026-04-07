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
