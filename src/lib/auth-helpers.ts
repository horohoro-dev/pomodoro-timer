import { auth } from "@/auth";

// サーバーコンポーネント用の認証ヘルパー
// 現在のユーザー情報を取得する
export async function getCurrentUser() {
  const session = await auth();

  if (!session?.user) {
    return null;
  }

  return session.user;
}
