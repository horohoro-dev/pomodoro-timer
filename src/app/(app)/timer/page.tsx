"use client";

import { useTranslations } from "next-intl";

// タイマーページ（プレースホルダー）
export default function TimerPage() {
  const t = useTranslations("timer");

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="flex max-w-md flex-col items-center gap-6 text-center">
        <h1 className="text-3xl font-bold text-foreground">{t("title")}</h1>
        <p className="text-muted-foreground">{t("placeholder")}</p>
      </div>
    </div>
  );
}
