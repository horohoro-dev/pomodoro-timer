// src/components/timer/timer-status.tsx
"use client";

import { useTranslations } from "next-intl";
import { useTimerStore } from "@/stores/timer-store";

// 秒を "Xh Ym" 形式にフォーマット
function formatTotalTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ループ周回数 + 累計作業時間の表示
export function TimerStatus() {
  const t = useTranslations("timer");
  const loopCount = useTimerStore((s) => s.loopCount);
  const totalWorkSeconds = useTimerStore((s) => s.totalWorkSeconds);

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-sm text-muted-foreground">
        {t("loopCount", { count: loopCount })}
      </span>
      <span className="text-sm text-muted-foreground/70">
        {t("totalTime", { time: formatTotalTime(totalWorkSeconds) })}
      </span>
    </div>
  );
}
