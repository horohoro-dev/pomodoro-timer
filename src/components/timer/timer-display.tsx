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

  const phaseLabel =
    phase === "work" || phase === "idle"
      ? t("work")
      : phase === "longBreak"
        ? t("longBreak")
        : t("break");

  return (
    <div className="flex h-55 w-55 flex-col items-center justify-center rounded-full border-4 border-primary">
      <span className="text-5xl font-bold tabular-nums tracking-tight text-foreground">
        {formatTime(remainingSeconds)}
      </span>
      <span className="mt-1 text-sm text-muted-foreground">{phaseLabel}</span>
    </div>
  );
}
