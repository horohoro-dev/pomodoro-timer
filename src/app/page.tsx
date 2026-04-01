"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

// トップページ: アプリ紹介とタイマーへの導線
export default function Home() {
  const t = useTranslations("home");
  const tc = useTranslations("common");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <main className="flex max-w-2xl flex-col items-center gap-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          {tc("appName")}
        </h1>
        <p className="text-lg text-muted-foreground sm:text-xl">
          {t("title")}
        </p>
        <p className="max-w-md text-muted-foreground">
          {t("subtitle")}
        </p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Link
            href="/timer"
            className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("startTimer")}
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex h-12 items-center justify-center rounded-md border border-border bg-background px-8 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            {t("viewDashboard")}
          </Link>
        </div>
      </main>
    </div>
  );
}
