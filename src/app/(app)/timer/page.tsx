"use client";

import { useEffect, useRef } from "react";
import { TimerControls } from "@/components/timer/timer-controls";
import { TimerDisplay } from "@/components/timer/timer-display";
import { TimerStatus } from "@/components/timer/timer-status";
import { useTimerStore } from "@/stores/timer-store";

// タイマーページ
export default function TimerPage() {
  const isRunning = useTimerStore((s) => s.isRunning);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // タイマー実行中は毎秒 tick を呼ぶ
  // useTimerStore.getState().tick を直接呼ぶことで参照安定性を確保
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        useTimerStore.getState().tick();
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-7 px-4 py-16">
      <TimerStatus />
      <TimerDisplay />
      <TimerControls />
    </div>
  );
}
