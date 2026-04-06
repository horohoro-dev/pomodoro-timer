import { beforeEach, describe, expect, it, vi } from "vitest";

// localStorageモック
const storage: Record<string, string> = {};
vi.stubGlobal("localStorage", {
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, value: string) => {
    storage[key] = value;
  },
  removeItem: (key: string) => {
    delete storage[key];
  },
});

describe("timer-store persistence", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const key of Object.keys(storage)) delete storage[key];
  });

  it("設定変更が localStorage に保存される", async () => {
    const { useTimerStore } = await import("@/stores/timer-store");
    useTimerStore.getState().updateConfig({ workDuration: 600 });
    // Zustand persistは非同期のため少し待つ
    await new Promise((r) => setTimeout(r, 100));
    const saved = storage["pomodoro-timer-config"];
    expect(saved).toBeDefined();
    expect(JSON.parse(saved)).toMatchObject({
      state: { config: { workDuration: 600 } },
    });
  });
});
