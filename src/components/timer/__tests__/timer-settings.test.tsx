// src/components/timer/__tests__/timer-settings.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type {
  TimerActions,
  TimerConfig,
  TimerState,
} from "@/stores/timer-store";

const mockUpdateConfig = vi.fn();
const mockOnClose = vi.fn();

vi.mock("@/stores/timer-store", () => ({
  useTimerStore: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    const map: Record<string, string> = {
      settings: "設定",
      workDuration: "作業時間",
      breakDuration: "休憩時間",
      longBreakDuration: "長休憩時間",
      longBreakInterval: "長休憩間隔",
      closeSettings: "閉じる",
    };
    if (key === "minutes") return `${params?.value}分`;
    if (key === "loops") return `${params?.value}ループ`;
    return map[key] ?? key;
  },
}));

import { useTimerStore } from "@/stores/timer-store";
import { TimerSettings } from "../timer-settings";

const mockUseTimerStore = vi.mocked(useTimerStore);

const defaultConfig: TimerConfig = {
  workDuration: 1500,
  breakDuration: 300,
  longBreakDuration: 900,
  longBreakInterval: 4,
};

const makeState = (
  overrides?: Partial<TimerState & TimerActions>,
): TimerState & TimerActions =>
  ({
    config: defaultConfig,
    updateConfig: mockUpdateConfig,
    ...overrides,
  }) as TimerState & TimerActions;

describe("TimerSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTimerStore.mockImplementation((selector) => selector(makeState()));
  });

  it("isOpen=false のとき aria-hidden='true' になる", () => {
    render(<TimerSettings isOpen={false} onClose={mockOnClose} />);
    const drawer = screen.getByRole("dialog", { hidden: true });
    expect(drawer).toHaveAttribute("aria-hidden", "true");
  });

  it("isOpen=true のとき設定ラベルが表示される", () => {
    render(<TimerSettings isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText("作業時間")).toBeInTheDocument();
    expect(screen.getByText("休憩時間")).toBeInTheDocument();
    expect(screen.getByText("長休憩時間")).toBeInTheDocument();
    expect(screen.getByText("長休憩間隔")).toBeInTheDocument();
  });

  it("現在の設定値が分単位で表示される", () => {
    render(<TimerSettings isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText("25分")).toBeInTheDocument();
    expect(screen.getByText("5分")).toBeInTheDocument();
    expect(screen.getByText("15分")).toBeInTheDocument();
    expect(screen.getByText("4ループ")).toBeInTheDocument();
  });

  it("作業時間の+1ボタンで updateConfig が1分増加で呼ばれる", async () => {
    render(<TimerSettings isOpen={true} onClose={mockOnClose} />);
    await userEvent.click(
      screen.getByRole("button", { name: "作業時間を1分増やす" }),
    );
    expect(mockUpdateConfig).toHaveBeenCalledWith({ workDuration: 1560 });
  });

  it("作業時間の+10ボタンで updateConfig が10分増加で呼ばれる", async () => {
    render(<TimerSettings isOpen={true} onClose={mockOnClose} />);
    await userEvent.click(
      screen.getByRole("button", { name: "作業時間を10分増やす" }),
    );
    expect(mockUpdateConfig).toHaveBeenCalledWith({ workDuration: 2100 });
  });

  it("作業時間の−1ボタンで updateConfig が1分減少で呼ばれる", async () => {
    render(<TimerSettings isOpen={true} onClose={mockOnClose} />);
    await userEvent.click(
      screen.getByRole("button", { name: "作業時間を1分減らす" }),
    );
    expect(mockUpdateConfig).toHaveBeenCalledWith({ workDuration: 1440 });
  });

  it("作業時間が最小値（1分）のとき−ボタンが disabled", () => {
    mockUseTimerStore.mockImplementation((selector) =>
      selector(makeState({ config: { ...defaultConfig, workDuration: 60 } })),
    );
    render(<TimerSettings isOpen={true} onClose={mockOnClose} />);
    expect(
      screen.getByRole("button", { name: "作業時間を1分減らす" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "作業時間を10分減らす" }),
    ).toBeDisabled();
  });

  it("作業時間が最大値（120分）のとき+ボタンが disabled", () => {
    mockUseTimerStore.mockImplementation((selector) =>
      selector(makeState({ config: { ...defaultConfig, workDuration: 7200 } })),
    );
    render(<TimerSettings isOpen={true} onClose={mockOnClose} />);
    expect(
      screen.getByRole("button", { name: "作業時間を1分増やす" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "作業時間を10分増やす" }),
    ).toBeDisabled();
  });

  it("長休憩間隔の+ボタンで updateConfig が1増加で呼ばれる", async () => {
    render(<TimerSettings isOpen={true} onClose={mockOnClose} />);
    await userEvent.click(
      screen.getByRole("button", { name: "長休憩間隔を1増やす" }),
    );
    expect(mockUpdateConfig).toHaveBeenCalledWith({ longBreakInterval: 5 });
  });

  it("✕ボタンクリックで onClose が呼ばれる", async () => {
    render(<TimerSettings isOpen={true} onClose={mockOnClose} />);
    const closeButton = screen.getByRole("button", { name: "閉じる" });
    await userEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalledOnce();
  });

  it("Escキーで onClose が呼ばれる", async () => {
    render(<TimerSettings isOpen={true} onClose={mockOnClose} />);
    await userEvent.keyboard("{Escape}");
    expect(mockOnClose).toHaveBeenCalledOnce();
  });
});
