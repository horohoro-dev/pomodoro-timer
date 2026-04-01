import { describe, expect, it } from "vitest";
import { cn } from "../styles";

describe("cn", () => {
  it("クラス名を結合する", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("条件付きクラスを処理する", () => {
    expect(cn("foo", false && "bar", "baz")).toBe("foo baz");
  });

  it("Tailwindクラスの競合を解決する", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });
});
