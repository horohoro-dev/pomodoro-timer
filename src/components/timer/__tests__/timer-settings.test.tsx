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

  it("作業時間の+ボタンで updateConfig が5分増加で呼ばれる", async () => {
    render(<TimerSettings isOpen={true} onClose={mockOnClose} />);
    const buttons = screen.getAllByRole("button", { name: /増やす/ });
    await userEvent.click(buttons[0]);
    expect(mockUpdateConfig).toHaveBeenCalledWith({ workDuration: 1800 });
  });

  it("作業時間の−ボタンで updateConfig が5分減少で呼ばれる", async () => {
    render(<TimerSettings isOpen={true} onClose={mockOnClose} />);
    const buttons = screen.getAllByRole("button", { name: /減らす/ });
    await userEvent.click(buttons[0]);
    expect(mockUpdateConfig).toHaveBeenCalledWith({ workDuration: 1200 });
  });

  it("作業時間が最小値（5分）のとき−ボタンが disabled", () => {
    mockUseTimerStore.mockImplementation((selector) =>
      selector(makeState({ config: { ...defaultConfig, workDuration: 300 } })),
    );
    render(<TimerSettings isOpen={true} onClose={mockOnClose} />);
    const buttons = screen.getAllByRole("button", { name: /減らす/ });
    expect(buttons[0]).toBeDisabled();
  });

  it("作業時間が最大値（120分）のとき+ボタンが disabled", () => {
    mockUseTimerStore.mockImplementation((selector) =>
      selector(makeState({ config: { ...defaultConfig, workDuration: 7200 } })),
    );
    render(<TimerSettings isOpen={true} onClose={mockOnClose} />);
    const buttons = screen.getAllByRole("button", { name: /増やす/ });
    expect(buttons[0]).toBeDisabled();
  });

  it("長休憩間隔の+ボタンで updateConfig が1増加で呼ばれる", async () => {
    render(<TimerSettings isOpen={true} onClose={mockOnClose} />);
    const buttons = screen.getAllByRole("button", { name: /増やす/ });
    await userEvent.click(buttons[3]);
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
