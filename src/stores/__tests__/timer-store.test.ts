// タイマーストアのテスト
// 各テストでストアを分離するため vi.resetModules() + 動的importを使用

describe("timer-store", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ストアを動的にインポートするヘルパー
  async function getStore() {
    const mod = await import("@/stores/timer-store");
    return mod.useTimerStore;
  }

  describe("初期状態", () => {
    it("idle状態、isRunning false、loopCount 0、totalWorkSeconds 0", async () => {
      const useTimerStore = await getStore();
      const state = useTimerStore.getState();

      expect(state.phase).toBe("idle");
      expect(state.isRunning).toBe(false);
      expect(state.loopCount).toBe(0);
      expect(state.totalWorkSeconds).toBe(0);
    });

    it("デフォルト設定値が正しい", async () => {
      const useTimerStore = await getStore();
      const { config } = useTimerStore.getState();

      expect(config.workDuration).toBe(1500);
      expect(config.breakDuration).toBe(300);
      expect(config.longBreakDuration).toBe(900);
      expect(config.longBreakInterval).toBe(4);
    });
  });

  describe("start", () => {
    it("idle → work に遷移し、isRunning true、_startedAt が number", async () => {
      const useTimerStore = await getStore();

      useTimerStore.getState().start();
      const state = useTimerStore.getState();

      expect(state.phase).toBe("work");
      expect(state.isRunning).toBe(true);
      expect(state.remainingSeconds).toBe(1500);
      expect(typeof state._startedAt).toBe("number");
      expect(state._initialRemaining).toBe(1500);
    });
  });

  describe("pause", () => {
    it("isRunning false、_startedAt null、_initialRemaining が残り秒数に更新される", async () => {
      const useTimerStore = await getStore();

      useTimerStore.getState().start();
      // 10秒経過
      vi.advanceTimersByTime(10_000);
      useTimerStore.getState().pause();
      const state = useTimerStore.getState();

      expect(state.isRunning).toBe(false);
      expect(state._startedAt).toBeNull();
      expect(state.remainingSeconds).toBe(1490);
      expect(state._initialRemaining).toBe(1490);
    });
  });

  describe("tick", () => {
    it("残り時間が正しく減る", async () => {
      const useTimerStore = await getStore();

      useTimerStore.getState().start();
      // 5秒経過
      vi.advanceTimersByTime(5_000);
      useTimerStore.getState().tick();
      const state = useTimerStore.getState();

      expect(state.remainingSeconds).toBe(1495);
    });

    it("作業完了で休憩フェーズに移行、loopCount+1、totalWorkSeconds加算", async () => {
      const useTimerStore = await getStore();

      // 短い作業時間でテスト
      useTimerStore
        .getState()
        .updateConfig({ workDuration: 10, breakDuration: 5 });
      useTimerStore.getState().start();

      // 10秒経過して作業完了
      vi.advanceTimersByTime(10_000);
      useTimerStore.getState().tick();
      const state = useTimerStore.getState();

      expect(state.phase).toBe("break");
      expect(state.remainingSeconds).toBe(5);
      expect(state.loopCount).toBe(1);
      expect(state.totalWorkSeconds).toBe(10);
    });

    it("longBreakInterval回ごとに長休憩に移行", async () => {
      const useTimerStore = await getStore();

      // 短い時間・interval=2でテスト
      useTimerStore.getState().updateConfig({
        workDuration: 5,
        breakDuration: 3,
        longBreakDuration: 10,
        longBreakInterval: 2,
      });

      // 1セット目: work → break
      useTimerStore.getState().start();
      vi.advanceTimersByTime(5_000);
      useTimerStore.getState().tick();
      expect(useTimerStore.getState().phase).toBe("break");

      // break → work
      vi.advanceTimersByTime(3_000);
      useTimerStore.getState().tick();
      expect(useTimerStore.getState().phase).toBe("work");

      // 2セット目: work → longBreak（loopCount=2、interval=2）
      vi.advanceTimersByTime(5_000);
      useTimerStore.getState().tick();
      expect(useTimerStore.getState().phase).toBe("longBreak");
      expect(useTimerStore.getState().loopCount).toBe(2);
      expect(useTimerStore.getState().remainingSeconds).toBe(10);
    });
  });

  describe("reset", () => {
    it("idle に戻り、設定は保持される", async () => {
      const useTimerStore = await getStore();

      // カスタム設定で作業開始
      useTimerStore.getState().updateConfig({ workDuration: 600 });
      useTimerStore.getState().start();
      vi.advanceTimersByTime(5_000);
      useTimerStore.getState().tick();

      // リセット
      useTimerStore.getState().reset();
      const state = useTimerStore.getState();

      expect(state.phase).toBe("idle");
      expect(state.isRunning).toBe(false);
      expect(state.loopCount).toBe(0);
      expect(state.totalWorkSeconds).toBe(0);
      expect(state._startedAt).toBeNull();
      expect(state._initialRemaining).toBeNull();
      // 設定は保持
      expect(state.config.workDuration).toBe(600);
      expect(state.remainingSeconds).toBe(600);
    });
  });

  describe("updateConfig", () => {
    it("idle時にworkDurationを変更するとremainingSecondsも更新される", async () => {
      const useTimerStore = await getStore();

      useTimerStore.getState().updateConfig({ workDuration: 3000 });
      const state = useTimerStore.getState();

      expect(state.config.workDuration).toBe(3000);
      expect(state.remainingSeconds).toBe(3000);
    });

    it("作業中にworkDurationを変更してもremainingSecondsは変わらない", async () => {
      const useTimerStore = await getStore();

      useTimerStore.getState().start();
      vi.advanceTimersByTime(5_000);
      useTimerStore.getState().tick();

      const remainingBefore = useTimerStore.getState().remainingSeconds;
      useTimerStore.getState().updateConfig({ workDuration: 3000 });

      expect(useTimerStore.getState().remainingSeconds).toBe(remainingBefore);
    });
  });
});
