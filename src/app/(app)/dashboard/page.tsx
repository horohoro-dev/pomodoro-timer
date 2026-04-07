import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { ROUTES } from "@/lib/routes";

// ダッシュボードページ（サーバーコンポーネント）
// 認証チェック付き
export default async function DashboardPage() {
  const user = await getCurrentUser();
  const t = await getTranslations("dashboard");

  // 未認証ユーザーはログインページへリダイレクト
  if (!user) {
    redirect(ROUTES.WELCOME);
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
