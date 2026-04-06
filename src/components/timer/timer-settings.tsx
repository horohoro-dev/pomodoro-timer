// src/components/timer/timer-settings.tsx
"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef } from "react";
import { useTimerStore } from "@/stores/timer-store";

// 設定項目の定義
interface SettingItem {
  key:
    | "workDuration"
    | "breakDuration"
    | "longBreakDuration"
    | "longBreakInterval";
  labelKey: string;
  /** 各ステップ幅（大きい順。例: [10, 1] → −10, −1, +1, +10） */
  steps: number[];
  min: number;
  max: number;
  toDisplay: (seconds: number) => number;
  toStore: (display: number) => number;
  formatKey: "minutes" | "loops";
  unit: string;
}

const SETTINGS: SettingItem[] = [
  {
    key: "workDuration",
    labelKey: "workDuration",
    steps: [10, 1],
    min: 1,
    max: 120,
    toDisplay: (s) => s / 60,
    toStore: (d) => d * 60,
    formatKey: "minutes",
    unit: "分",
  },
  {
    key: "breakDuration",
    labelKey: "breakDuration",
    steps: [10, 1],
    min: 1,
    max: 30,
    toDisplay: (s) => s / 60,
    toStore: (d) => d * 60,
    formatKey: "minutes",
    unit: "分",
  },
  {
    key: "longBreakDuration",
    labelKey: "longBreakDuration",
    steps: [10, 1],
    min: 1,
    max: 60,
    toDisplay: (s) => s / 60,
    toStore: (d) => d * 60,
    formatKey: "minutes",
    unit: "分",
  },
  {
    key: "longBreakInterval",
    labelKey: "longBreakInterval",
    steps: [1],
    min: 2,
    max: 10,
    toDisplay: (v) => v,
    toStore: (v) => v,
    formatKey: "loops",
    unit: "",
  },
];

interface TimerSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

// ステップボタンコンポーネント（フック呼び出し規則のため分離）
function StepButton({
  item,
  step,
  direction,
  latestValue,
  onUpdate,
}: {
  item: SettingItem;
  step: number;
  direction: "dec" | "inc";
  latestValue: React.RefObject<number>;
  onUpdate: (newValue: number) => void;
}) {
  const t = useTranslations("timer");
  const displayValue = item.toDisplay(latestValue.current);
  const disabled =
    direction === "dec" ? displayValue <= item.min : displayValue >= item.max;

  const handleClick = useCallback(() => {
    const current = item.toDisplay(latestValue.current);
    if (direction === "dec" && current > item.min) {
      const next = Math.max(item.min, current - step);
      onUpdate(item.toStore(next));
    } else if (direction === "inc" && current < item.max) {
      const next = Math.min(item.max, current + step);
      onUpdate(item.toStore(next));
    }
  }, [item, step, direction, latestValue, onUpdate]);

  const longPress = useLongPress(handleClick);
  const label =
    direction === "dec"
      ? `${t(item.labelKey)}を${step}${item.unit}減らす`
      : `${t(item.labelKey)}を${step}${item.unit}増やす`;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-muted text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground"
      {...longPress}
    >
      {direction === "dec"
        ? `−${step > 1 ? step : ""}`
        : `+${step > 1 ? step : ""}`}
    </button>
  );
}

// 設定行コンポーネント
function SettingRow({
  item,
  value,
  onUpdate,
}: {
  item: SettingItem;
  value: number;
  onUpdate: (newValue: number) => void;
}) {
  const t = useTranslations("timer");
  const displayValue = item.toDisplay(value);
  const latestValue = useRef(value);
  latestValue.current = value;

  return (
    <div>
      <div className="mb-1.5 text-xs tracking-wide text-muted-foreground uppercase">
        {t(item.labelKey)}
      </div>
      <div className="flex items-center gap-1">
        {/* 減少ボタン（大きいステップから） */}
        {item.steps.map((step) => (
          <StepButton
            key={`dec-${step}`}
            item={item}
            step={step}
            direction="dec"
            latestValue={latestValue}
            onUpdate={onUpdate}
          />
        ))}
        <span className="flex-1 text-center text-sm font-semibold text-foreground">
          {t(item.formatKey, { value: displayValue })}
        </span>
        {/* 増加ボタン（小さいステップから） */}
        {[...item.steps].reverse().map((step) => (
          <StepButton
            key={`inc-${step}`}
            item={item}
            step={step}
            direction="inc"
            latestValue={latestValue}
            onUpdate={onUpdate}
          />
        ))}
      </div>
    </div>
  );
}

// 長押しで連続変更するフック
function useLongPress(callback: () => void) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    timeoutRef.current = null;
    intervalRef.current = null;
  }, []);

  const start = useCallback(() => {
    stop();
    // 400ms後にリピート開始、100ms間隔で発火
    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(callback, 100);
    }, 400);
  }, [callback, stop]);

  // コンポーネントアンマウント時にクリーンアップ
  useEffect(() => stop, [stop]);

  return { onPointerDown: start, onPointerUp: stop, onPointerLeave: stop };
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
      className={`absolute right-0 top-0 bottom-0 flex w-56 flex-col border-l border-border bg-card transition-transform duration-300 ${
        isOpen ? "translate-x-0" : "pointer-events-none translate-x-full"
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
        {SETTINGS.map((item) => (
          <SettingRow
            key={item.key}
            item={item}
            value={config[item.key]}
            onUpdate={(newValue) => updateConfig({ [item.key]: newValue })}
          />
        ))}
      </div>
    </div>
  );
}
