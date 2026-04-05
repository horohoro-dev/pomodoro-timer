// ポモドーロタイマーの状態管理ストア
import { create } from "zustand";
import { persist } from "zustand/middleware";

/** タイマーのフェーズ */
export type TimerPhase = "work" | "break" | "longBreak" | "idle";

/** タイマー設定 */
export interface TimerConfig {
  /** 作業時間（秒） */
  workDuration: number;
  /** 休憩時間（秒） */
  breakDuration: number;
  /** 長休憩時間（秒） */
  longBreakDuration: number;
  /** 長休憩までのインターバル回数 */
  longBreakInterval: number;
}

/** タイマーの状態 */
export interface TimerState {
  phase: TimerPhase;
  remainingSeconds: number;
  isRunning: boolean;
  loopCount: number;
  totalWorkSeconds: number;
  config: TimerConfig;
  /** start時に記録するタイムスタンプ（tickでは変更しない） */
  _startedAt: number | null;
  /** start時の残り秒数（drift防止用） */
  _initialRemaining: number | null;
}

/** タイマーのアクション */
export interface TimerActions {
  start: () => void;
  pause: () => void;
  reset: () => void;
  tick: () => void;
  updateConfig: (config: Partial<TimerConfig>) => void;
}

/** デフォルト設定 */
const DEFAULT_CONFIG: TimerConfig = {
  workDuration: 1500, // 25分
  breakDuration: 300, // 5分
  longBreakDuration: 900, // 15分
  longBreakInterval: 4,
};

export const useTimerStore = create<TimerState & TimerActions>()(
  persist(
    (set, get) => ({
      // 初期状態
      phase: "idle",
      remainingSeconds: DEFAULT_CONFIG.workDuration,
      isRunning: false,
      loopCount: 0,
      totalWorkSeconds: 0,
      config: DEFAULT_CONFIG,
      _startedAt: null,
      _initialRemaining: null,

      start: () => {
        const { phase, config, _initialRemaining } = get();
        const remaining =
          _initialRemaining ??
          (phase === "idle" ? config.workDuration : get().remainingSeconds);
        set({
          phase: phase === "idle" ? "work" : phase,
          isRunning: true,
          remainingSeconds: remaining,
          _startedAt: Date.now(),
          _initialRemaining: remaining,
        });
      },

      pause: () => {
        const { _startedAt, _initialRemaining } = get();
        if (!_startedAt || !_initialRemaining) return;
        const elapsed = Math.floor((Date.now() - _startedAt) / 1000);
        const remaining = Math.max(0, _initialRemaining - elapsed);
        set({
          isRunning: false,
          remainingSeconds: remaining,
          _startedAt: null,
          _initialRemaining: remaining,
        });
      },

      tick: () => {
        const {
          _startedAt,
          _initialRemaining,
          phase,
          isRunning,
          loopCount,
          totalWorkSeconds,
          config,
        } = get();
        if (!isRunning || !_startedAt || _initialRemaining === null) return;

        const elapsed = Math.floor((Date.now() - _startedAt) / 1000);
        const remaining = Math.max(0, _initialRemaining - elapsed);

        if (remaining > 0) {
          set({ remainingSeconds: remaining });
          return;
        }

        // フェーズ完了時の遷移
        if (phase === "work") {
          const newLoopCount = loopCount + 1;
          const isLongBreak = newLoopCount % config.longBreakInterval === 0;
          const nextPhase = isLongBreak ? "longBreak" : "break";
          const nextDuration = isLongBreak
            ? config.longBreakDuration
            : config.breakDuration;
          set({
            phase: nextPhase,
            remainingSeconds: nextDuration,
            loopCount: newLoopCount,
            totalWorkSeconds: totalWorkSeconds + config.workDuration,
            _startedAt: Date.now(),
            _initialRemaining: nextDuration,
          });
        } else {
          // 休憩・長休憩 → 作業へ
          set({
            phase: "work",
            remainingSeconds: config.workDuration,
            _startedAt: Date.now(),
            _initialRemaining: config.workDuration,
          });
        }
      },

      reset: () => {
        const { config } = get();
        set({
          phase: "idle",
          remainingSeconds: config.workDuration,
          isRunning: false,
          loopCount: 0,
          totalWorkSeconds: 0,
          _startedAt: null,
          _initialRemaining: null,
        });
      },

      updateConfig: (partial) => {
        const { config, phase } = get();
        const newConfig = { ...config, ...partial };
        set({
          config: newConfig,
          ...(phase === "idle"
            ? { remainingSeconds: newConfig.workDuration }
            : {}),
        });
      },
    }),
    {
      // localStorage のキー名
      name: "pomodoro-timer-config",
      // config のみ永続化（タイマー実行状態は保存しない）
      partialize: (state) => ({ config: state.config }),
    },
  ),
);
