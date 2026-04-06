// src/components/timer/__tests__/timer-display.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { TimerActions, TimerState } from "@/stores/timer-store";

// Zustandストアをモック
vi.mock("@/stores/timer-store", () => ({
  useTimerStore: vi.fn(),
}));

// next-intlをモック
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      work: "作業",
      break: "休憩",
      longBreak: "長い休憩",
      pause: "一時停止",
    };
    return map[key] ?? key;
  },
}));

import { useTimerStore } from "@/stores/timer-store";
import { TimerDisplay } from "../timer-display";

const mockUseTimerStore = vi.mocked(useTimerStore);

describe("TimerDisplay", () => {
  it("残り時間を mm:ss 形式で表示する", () => {
    mockUseTimerStore.mockImplementation(
      (selector: (s: TimerState & TimerActions) => unknown) =>
        selector({ remainingSeconds: 1500, phase: "work" } as TimerState &
          TimerActions),
    );
    render(<TimerDisplay />);
    expect(screen.getByText("25:00")).toBeInTheDocument();
  });

  it("作業フェーズのラベルを表示する", () => {
    mockUseTimerStore.mockImplementation(
      (selector: (s: TimerState & TimerActions) => unknown) =>
        selector({ remainingSeconds: 1500, phase: "work" } as TimerState &
          TimerActions),
    );
    render(<TimerDisplay />);
    expect(screen.getByText("作業")).toBeInTheDocument();
  });

  it("休憩フェーズのラベルを表示する", () => {
    mockUseTimerStore.mockImplementation(
      (selector: (s: TimerState & TimerActions) => unknown) =>
        selector({ remainingSeconds: 300, phase: "break" } as TimerState &
          TimerActions),
    );
    render(<TimerDisplay />);
    expect(screen.getByText("休憩")).toBeInTheDocument();
  });

  it("秒数が1桁の場合ゼロパディングする", () => {
    mockUseTimerStore.mockImplementation(
      (selector: (s: TimerState & TimerActions) => unknown) =>
        selector({ remainingSeconds: 65, phase: "work" } as TimerState &
          TimerActions),
    );
    render(<TimerDisplay />);
    expect(screen.getByText("01:05")).toBeInTheDocument();
  });

  it("一時停止中はオーバーレイが表示される", () => {
    mockUseTimerStore.mockImplementation(
      (selector: (s: TimerState & TimerActions) => unknown) =>
        selector({
          remainingSeconds: 1200,
          phase: "work",
          isRunning: false,
        } as TimerState & TimerActions),
    );
    render(<TimerDisplay />);
    expect(screen.getByLabelText("一時停止")).toBeInTheDocument();
  });

  it("実行中はオーバーレイが表示されない", () => {
    mockUseTimerStore.mockImplementation(
      (selector: (s: TimerState & TimerActions) => unknown) =>
        selector({
          remainingSeconds: 1200,
          phase: "work",
          isRunning: true,
        } as TimerState & TimerActions),
    );
    render(<TimerDisplay />);
    expect(screen.queryByLabelText("一時停止")).not.toBeInTheDocument();
  });

  it("idle状態ではオーバーレイが表示されない", () => {
    mockUseTimerStore.mockImplementation(
      (selector: (s: TimerState & TimerActions) => unknown) =>
        selector({
          remainingSeconds: 1500,
          phase: "idle",
          isRunning: false,
        } as TimerState & TimerActions),
    );
    render(<TimerDisplay />);
    expect(screen.queryByLabelText("一時停止")).not.toBeInTheDocument();
  });
});
