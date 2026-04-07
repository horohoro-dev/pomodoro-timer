// ゲスト選択時にhasVisited cookieを設定するServer Action
"use server";

import { cookies } from "next/headers";

export async function setHasVisitedCookie() {
  const cookieStore = await cookies();
  cookieStore.set("hasVisited", "true", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365 * 10, // 10年
  });
}
