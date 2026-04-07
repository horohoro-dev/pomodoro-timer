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
