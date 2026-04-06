/**
 * タイマーコントロールコンポーネント
 *
 * ▶（開始）/ ⏸（一時停止）/ ↻（リセット）のアイコンボタンを提供する。
 * 実行状態に応じてボタンが切り替わり、リセットはidle以外のフェーズでのみ表示。
 */
"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useTimerStore } from "@/stores/timer-store";

// タイマーコントロールボタン
export function TimerControls() {
  const t = useTranslations("timer");
  const isRunning = useTimerStore((s) => s.isRunning);
  const phase = useTimerStore((s) => s.phase);
  const start = useTimerStore((s) => s.start);
  const pause = useTimerStore((s) => s.pause);
  const reset = useTimerStore((s) => s.reset);

  return (
    <div className="flex items-center gap-3">
      {isRunning ? (
        <Button
          variant="outline"
          onClick={pause}
          aria-label={t("pause")}
          size="lg"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="h-6 w-6"
            aria-hidden="true"
          >
            <line x1="8" y1="5" x2="8" y2="19" />
            <line x1="16" y1="5" x2="16" y2="19" />
          </svg>
        </Button>
      ) : (
        <Button
          variant="outline"
          onClick={start}
          aria-label={t("start")}
          size="lg"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            className="h-6 w-6"
            aria-hidden="true"
          >
            <path d="M7 4v16l13-8z" />
          </svg>
        </Button>
      )}
      {phase !== "idle" && (
        <Button variant="outline" onClick={reset} aria-label={t("reset")}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <path d="M3 12a9 9 0 1 1 3 6.7" />
            <polyline points="3 22 3 16 9 16" />
          </svg>
        </Button>
      )}
    </div>
  );
}
