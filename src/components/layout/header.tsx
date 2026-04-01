"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/styles";

// アプリ内共通ヘッダーコンポーネント
export function Header() {
  const t = useTranslations("common");
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(false);

  // 初期ダークモード状態を取得
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  // ダークモード切替
  const toggleDarkMode = useCallback(() => {
    const next = !isDark;
    document.documentElement.classList.toggle("dark", next);
    setIsDark(next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }, [isDark]);

  // ナビゲーションリンク定義
  const navLinks = [
    { href: "/timer", label: t("timer") },
    { href: "/dashboard", label: t("dashboard") },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        {/* アプリ名 */}
        <Link
          href="/"
          className="text-lg font-bold text-foreground"
        >
          {t("appName")}
        </Link>

        {/* ナビゲーション */}
        <nav className="flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                pathname === link.href
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}

          {/* ダークモード切替ボタン */}
          <button
            onClick={toggleDarkMode}
            className="ml-2 rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={isDark ? t("lightMode") : t("darkMode")}
          >
            {isDark ? (
              // 太陽アイコン（ライトモードへ）
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-5 w-5"
              >
                <path d="M10 2a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 2zM10 15a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 15zM10 7a3 3 0 100 6 3 3 0 000-6zM15.657 5.404a.75.75 0 10-1.06-1.06l-1.061 1.06a.75.75 0 001.06 1.06l1.06-1.06zM6.464 14.596a.75.75 0 10-1.06-1.06l-1.06 1.06a.75.75 0 001.06 1.06l1.06-1.06zM18 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 0118 10zM5 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 015 10zM14.596 15.657a.75.75 0 001.06-1.06l-1.06-1.061a.75.75 0 10-1.06 1.06l1.06 1.06zM5.404 6.464a.75.75 0 001.06-1.06l-1.06-1.06a.75.75 0 10-1.06 1.06l1.06 1.06z" />
              </svg>
            ) : (
              // 月アイコン（ダークモードへ）
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-5 w-5"
              >
                <path
                  fillRule="evenodd"
                  d="M7.455 2.004a.75.75 0 01.26.77 7 7 0 009.958 7.967.75.75 0 011.067.853A8.5 8.5 0 116.647 1.921a.75.75 0 01.808.083z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>

          {/* 言語切替プレースホルダー */}
          <span className="ml-1 rounded-md px-2 py-1 text-xs text-muted-foreground">
            {t("language")}
          </span>
        </nav>
      </div>
    </header>
  );
}
