import { auth } from "@/auth";
import { NextResponse } from "next/server";

// 認証が必要なパスのパターン
const protectedPaths = ["/dashboard"];

// Auth.js v5 ミドルウェア
export default auth((req) => {
  const { pathname } = req.nextUrl;

  // 保護ルートのチェック
  const isProtected = protectedPaths.some((path) =>
    pathname.startsWith(path)
  );

  // 認証が必要なルートで未認証の場合はサインインページへリダイレクト
  if (isProtected && !req.auth) {
    const signInUrl = new URL("/auth/signin", req.nextUrl.origin);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

// ミドルウェアを適用するパスの設定
// 静的ファイル、API認証ルート、画像は除外
export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.).*)",
  ],
};
