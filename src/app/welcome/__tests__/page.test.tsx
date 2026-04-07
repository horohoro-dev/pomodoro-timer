// src/app/welcome/__tests__/page.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

// next-intlモック
vi.mock("next-intl", () => ({
  useTranslations: (ns: string) => (key: string) => `${ns}.${key}`,
}));

// next-auth/reactモック
const mockSignIn = vi.fn();
vi.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
}));

// Server Actionモック
const mockSetHasVisitedCookie = vi.fn();
vi.mock("../actions", () => ({
  setHasVisitedCookie: () => mockSetHasVisitedCookie(),
}));

// next/navigationモック
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

import WelcomePage from "../page";

describe("WelcomePage", () => {
  it("アプリ名・タイトル・サブタイトルが表示される", () => {
    render(<WelcomePage />);
    expect(screen.getByText("common.appName")).toBeInTheDocument();
    expect(screen.getByText("welcome.title")).toBeInTheDocument();
    expect(screen.getByText("welcome.subtitle")).toBeInTheDocument();
  });

  it("GoogleログインボタンをクリックするとsignInが呼ばれる", async () => {
    const user = userEvent.setup();
    render(<WelcomePage />);

    await user.click(screen.getByText("welcome.loginWithGoogle"));
    expect(mockSignIn).toHaveBeenCalledWith("google", { callbackUrl: "/" });
  });

  it("ゲストボタンをクリックするとcookie設定される", async () => {
    const user = userEvent.setup();
    render(<WelcomePage />);

    await user.click(screen.getByText("welcome.continueAsGuest"));
    expect(mockSetHasVisitedCookie).toHaveBeenCalled();
  });

  it("ゲストモードの説明が表示される", () => {
    render(<WelcomePage />);
    expect(screen.getByText("welcome.guestNote")).toBeInTheDocument();
  });
});
