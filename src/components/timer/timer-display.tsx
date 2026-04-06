/**
 * タイマー表示コンポーネント
 *
 * 残り時間をmm:ss形式で円形に表示し、現在のフェーズ（作業・休憩・長休憩）の
 * ラベルを添える。一時停止中は半透明の⏸オーバーレイを重ねて状態を視覚的に示す。
 */
"use client";

import { useTranslations } from "next-intl";
import { useTimerStore } from "@/stores/timer-store";

// 秒数を mm:ss 形式にフォーマット
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// タイマー円コンポーネント
export function TimerDisplay() {
  const t = useTranslations("timer");
  const remainingSeconds = useTimerStore((s) => s.remainingSeconds);
  const phase = useTimerStore((s) => s.phase);
  const isRunning = useTimerStore((s) => s.isRunning);

  const phaseLabel =
    phase === "work" || phase === "idle"
      ? t("work")
      : phase === "longBreak"
        ? t("longBreak")
        : t("break");

  // 一時停止中 = タイマー開始済みだが停止中
  const isPaused = phase !== "idle" && !isRunning;

  return (
    <div className="relative flex h-55 w-55 flex-col items-center justify-center rounded-full border-4 border-primary">
      <span className="text-5xl font-bold tabular-nums tracking-tight text-foreground">
        {formatTime(remainingSeconds)}
      </span>
      <span className="mt-1 text-sm text-muted-foreground">{phaseLabel}</span>

      {/* 一時停止オーバーレイ */}
      {isPaused && (
        <div
          role="status"
          className="absolute inset-0 flex items-center justify-center rounded-full bg-background/60"
          aria-label={t("pause")}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="h-16 w-16 text-muted-foreground/70"
            aria-hidden="true"
          >
            <line x1="8" y1="5" x2="8" y2="19" />
            <line x1="16" y1="5" x2="16" y2="19" />
          </svg>
        </div>
      )}
    </div>
  );
}
