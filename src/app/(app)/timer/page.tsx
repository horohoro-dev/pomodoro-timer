/**
 * タイマーページ
 *
 * ポモドーロタイマーのメイン画面。タイマー表示・コントロール・ステータスを
 * 中央に配置し、idle時に右端の⚙アイコンから設定ドロワーを開ける。
 * タイマー実行中は1秒間隔でtickを発火し、開始時にドロワーを自動で閉じる。
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { TimerControls } from "@/components/timer/timer-controls";
import { TimerDisplay } from "@/components/timer/timer-display";
import { TimerSettings } from "@/components/timer/timer-settings";
import { TimerStatus } from "@/components/timer/timer-status";
import { useTimerStore } from "@/stores/timer-store";

// タイマーページ
export default function TimerPage() {
  const isRunning = useTimerStore((s) => s.isRunning);
  const phase = useTimerStore((s) => s.phase);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // タイマー実行中は毎秒 tick を呼ぶ
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

  // タイマー開始時にドロワーを閉じる
  useEffect(() => {
    if (phase !== "idle") setIsSettingsOpen(false);
  }, [phase]);

  const isIdle = phase === "idle";

  return (
    <div className="relative flex flex-1">
      {/* タイマーメインエリア */}
      <div className="flex flex-1 flex-col items-center justify-center gap-7 px-4 py-16">
        <TimerStatus />
        <TimerDisplay />
        <TimerControls />
      </div>

      {/* 設定アイコン（idle時のみ） */}
      {isIdle && !isSettingsOpen && (
        <button
          type="button"
          onClick={() => setIsSettingsOpen(true)}
          aria-label="設定を開く"
          className="absolute right-4 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
        >
          ⚙
        </button>
      )}

      {/* 設定ドロワー */}
      <TimerSettings
        isOpen={isIdle && isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
