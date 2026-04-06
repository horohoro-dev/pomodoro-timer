// src/components/timer/__tests__/timer-status.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/stores/timer-store", () => ({
  useTimerStore: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    const map: Record<string, string> = {
      loopCount: `ループ ${params?.count} 周目`,
      totalTime: `合計 ${params?.time}`,
    };
    return map[key] ?? key;
  },
}));

import { useTimerStore } from "@/stores/timer-store";
import { TimerStatus } from "../timer-status";

const mockUseTimerStore = vi.mocked(useTimerStore);

describe("TimerStatus", () => {
  it("ループ周回数を表示する", () => {
    mockUseTimerStore.mockImplementation(
      (selector: Parameters<typeof useTimerStore>[0]) =>
        selector({ loopCount: 3, totalWorkSeconds: 4500 } as Parameters<
          typeof selector
        >[0]),
    );
    render(<TimerStatus />);
    expect(screen.getByText(/ループ 3 周目/)).toBeInTheDocument();
  });

  it("累計作業時間を表示する（時間+分）", () => {
    mockUseTimerStore.mockImplementation(
      (selector: Parameters<typeof useTimerStore>[0]) =>
        selector({ loopCount: 5, totalWorkSeconds: 9060 } as Parameters<
          typeof selector
        >[0]),
    );
    render(<TimerStatus />);
    // 9060秒 = 2h 31m
    expect(screen.getByText(/合計 2h 31m/)).toBeInTheDocument();
  });

  it("0秒の場合は 0m と表示する", () => {
    mockUseTimerStore.mockImplementation(
      (selector: Parameters<typeof useTimerStore>[0]) =>
        selector({ loopCount: 0, totalWorkSeconds: 0 } as Parameters<
          typeof selector
        >[0]),
    );
    render(<TimerStatus />);
    expect(screen.getByText(/合計 0m/)).toBeInTheDocument();
  });
});
