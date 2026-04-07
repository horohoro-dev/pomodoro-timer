// ウェルカムページ: 初回アクセス時のログイン選択画面
"use client";

import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { setHasVisitedCookie } from "./actions";

export default function WelcomePage() {
  const t = useTranslations("welcome");
  const tc = useTranslations("common");
  const router = useRouter();

  const handleGoogleLogin = () => {
    signIn("google", { callbackUrl: "/" });
  };

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
