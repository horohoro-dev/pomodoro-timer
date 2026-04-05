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
    <div className="flex gap-3">
      {isRunning ? (
        <Button onClick={pause}>{t("pause")}</Button>
      ) : (
        <Button onClick={start}>{t("start")}</Button>
      )}
      {phase !== "idle" && (
        <Button variant="outline" onClick={reset}>
          {t("reset")}
        </Button>
      )}
    </div>
  );
}
