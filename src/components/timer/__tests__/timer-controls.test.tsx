// src/components/timer/__tests__/timer-controls.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { TimerActions, TimerState } from "@/stores/timer-store";

const mockStart = vi.fn();
const mockPause = vi.fn();
const mockReset = vi.fn();

vi.mock("@/stores/timer-store", () => ({
  useTimerStore: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      start: "開始",
      pause: "一時停止",
      reset: "リセット",
    };
    return map[key] ?? key;
  },
}));

import { useTimerStore } from "@/stores/timer-store";
import { TimerControls } from "../timer-controls";

const mockUseTimerStore = vi.mocked(useTimerStore);

describe("TimerControls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // モックストア用の部分状態ヘルパー
  const makeState = (
    overrides: Partial<TimerState & TimerActions>,
  ): TimerState & TimerActions =>
    ({
      isRunning: false,
      phase: "idle",
      start: mockStart,
      pause: mockPause,
      reset: mockReset,
      ...overrides,
    }) as TimerState & TimerActions;

  it("停止中は開始ボタンを表示する", () => {
    mockUseTimerStore.mockImplementation((selector) =>
      selector(makeState({ isRunning: false, phase: "idle" })),
    );
    render(<TimerControls />);
    expect(screen.getByRole("button", { name: "開始" })).toBeInTheDocument();
  });

  it("実行中は一時停止ボタンを表示する", () => {
    mockUseTimerStore.mockImplementation((selector) =>
      selector(makeState({ isRunning: true, phase: "work" })),
    );
    render(<TimerControls />);
    expect(
      screen.getByRole("button", { name: "一時停止" }),
    ).toBeInTheDocument();
  });

  it("開始ボタンクリックで start が呼ばれる", async () => {
    mockUseTimerStore.mockImplementation((selector) =>
      selector(makeState({ isRunning: false, phase: "idle" })),
    );
    render(<TimerControls />);
    await userEvent.click(screen.getByRole("button", { name: "開始" }));
    expect(mockStart).toHaveBeenCalledOnce();
  });

  it("リセットボタンクリックで reset が呼ばれる", async () => {
    mockUseTimerStore.mockImplementation((selector) =>
      selector(makeState({ isRunning: true, phase: "work" })),
    );
    render(<TimerControls />);
    await userEvent.click(screen.getByRole("button", { name: "リセット" }));
    expect(mockReset).toHaveBeenCalledOnce();
  });
});
