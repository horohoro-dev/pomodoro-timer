"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

// ヘッダー内ユーザーメニューコンポーネント
export function UserMenu() {
  const { data: session, status } = useSession();
  const t = useTranslations("auth");
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // メニュー外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const toggleMenu = useCallback(() => setIsOpen((prev) => !prev), []);

  // ローディング中はスケルトン表示
  if (status === "loading") {
    return (
      <div
        data-testid="user-menu-skeleton"
        className="h-8 w-8 animate-pulse rounded-full bg-muted"
      />
    );
  }

  const isAuthenticated = status === "authenticated" && session?.user;
  const userName = session?.user?.name ?? t("guest");
  const userImage = session?.user?.image;

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={toggleMenu}
        aria-label={isAuthenticated ? userName : t("guest")}
        className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-border bg-muted transition-colors hover:bg-muted/80"
      >
        {isAuthenticated && userImage ? (
          // biome-ignore lint/performance/noImgElement: 外部OAuthアバターURLは動的で、next/imageのドメイン設定が不定
          <img
            src={userImage}
            alt={userName}
            className="h-full w-full object-cover"
          />
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-5 w-5 text-muted-foreground"
            aria-hidden="true"
          >
            <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
          </svg>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-md border border-border bg-card py-1 shadow-lg">
          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => {
                signOut();
                setIsOpen(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted"
            >
              {t("logout")}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                signIn("google");
                setIsOpen(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted"
            >
              {t("loginWithGoogle")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
