// src/components/timer/timer-settings.tsx
"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useTimerStore } from "@/stores/timer-store";

// 設定項目の定義
interface SettingItem {
  key:
    | "workDuration"
    | "breakDuration"
    | "longBreakDuration"
    | "longBreakInterval";
  labelKey: string;
  step: number;
  min: number;
  max: number;
  toDisplay: (seconds: number) => number;
  toStore: (display: number) => number;
  formatKey: "minutes" | "loops";
}

const SETTINGS: SettingItem[] = [
  {
    key: "workDuration",
    labelKey: "workDuration",
    step: 5,
    min: 5,
    max: 120,
    toDisplay: (s) => s / 60,
    toStore: (d) => d * 60,
    formatKey: "minutes",
  },
  {
    key: "breakDuration",
    labelKey: "breakDuration",
    step: 5,
    min: 5,
    max: 30,
    toDisplay: (s) => s / 60,
    toStore: (d) => d * 60,
    formatKey: "minutes",
  },
  {
    key: "longBreakDuration",
    labelKey: "longBreakDuration",
    step: 5,
    min: 5,
    max: 60,
    toDisplay: (s) => s / 60,
    toStore: (d) => d * 60,
    formatKey: "minutes",
  },
  {
    key: "longBreakInterval",
    labelKey: "longBreakInterval",
    step: 1,
    min: 2,
    max: 10,
    toDisplay: (v) => v,
    toStore: (v) => v,
    formatKey: "loops",
  },
];

interface TimerSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

// タイマー設定ドロワー
export function TimerSettings({ isOpen, onClose }: TimerSettingsProps) {
  const t = useTranslations("timer");
  const config = useTimerStore((s) => s.config);
  const updateConfig = useTimerStore((s) => s.updateConfig);

  // Escキーでドロワーを閉じる
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <div
      role="dialog"
      aria-label={t("settings")}
      aria-hidden={!isOpen}
      className={`flex w-56 shrink-0 flex-col border-l border-border bg-card transition-all duration-300 ${
        isOpen
          ? "translate-x-0 opacity-100"
          : "pointer-events-none w-0 translate-x-full overflow-hidden border-l-0 opacity-0"
      }`}
    >
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <span className="text-sm font-semibold text-foreground">
          {t("settings")}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("closeSettings")}
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          ✕
        </button>
      </div>

      <div className="flex flex-col gap-5 px-4 py-3">
        {SETTINGS.map((item) => {
          const storeValue = config[item.key];
          const displayValue = item.toDisplay(storeValue);
          const isMin = displayValue <= item.min;
          const isMax = displayValue >= item.max;

          return (
            <div key={item.key}>
              <div className="mb-1.5 text-xs tracking-wide text-muted-foreground uppercase">
                {t(item.labelKey)}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    updateConfig({
                      [item.key]: item.toStore(displayValue - item.step),
                    })
                  }
                  disabled={isMin}
                  aria-label={`${t(item.labelKey)}を${item.step}${item.formatKey === "minutes" ? "分" : ""}減らす`}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-muted text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground"
                >
                  −
                </button>
                <span className="flex-1 text-center text-sm font-semibold text-foreground">
                  {t(item.formatKey, { value: displayValue })}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    updateConfig({
                      [item.key]: item.toStore(displayValue + item.step),
                    })
                  }
                  disabled={isMax}
                  aria-label={`${t(item.labelKey)}を${item.step}${item.formatKey === "minutes" ? "分" : ""}増やす`}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-muted text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
