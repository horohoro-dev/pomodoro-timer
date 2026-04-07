import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    insert: vi.fn(),
  },
}));

vi.mock("@/db/schema", () => ({
  users: { id: "id" },
}));

describe("ensureUserExists", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("INSERT + onConflictDoNothingでユーザーを作成する", async () => {
    const { db } = await import("@/db");
    const mockOnConflict = vi.fn().mockResolvedValue(undefined);
    const mockValues = vi.fn().mockReturnValue({
      onConflictDoNothing: mockOnConflict,
    });
    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({
      values: mockValues,
    });

    const { ensureUserExists } = await import("@/lib/auth-helpers");
    await ensureUserExists("google-sub-123");

    expect(db.insert).toHaveBeenCalled();
    expect(mockValues).toHaveBeenCalledWith({ id: "google-sub-123" });
    expect(mockOnConflict).toHaveBeenCalled();
  });

  it("DB障害時はエラーがそのまま伝播する", async () => {
    const { db } = await import("@/db");
    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockRejectedValue(new Error("DB error")),
      }),
    });

    const { ensureUserExists } = await import("@/lib/auth-helpers");
    await expect(ensureUserExists("google-sub-123")).rejects.toThrow(
      "DB error",
    );
  });
});
