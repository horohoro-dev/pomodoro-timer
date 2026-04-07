// src/components/layout/__tests__/user-menu.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: (ns: string) => (key: string) => `${ns}.${key}`,
}));

const mockSignIn = vi.fn();
const mockSignOut = vi.fn();
let mockSessionData: { data: unknown; status: string } = {
  data: null,
  status: "unauthenticated",
};

vi.mock("next-auth/react", () => ({
  useSession: () => mockSessionData,
  signIn: (...args: unknown[]) => mockSignIn(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));

import { UserMenu } from "../user-menu";

describe("UserMenu", () => {
  beforeEach(() => {
    mockSignIn.mockReset();
    mockSignOut.mockReset();
  });

  it("未認証時はデフォルトアイコンを表示する", () => {
    mockSessionData = { data: null, status: "unauthenticated" };
    render(<UserMenu />);
    expect(screen.getByLabelText("auth.guest")).toBeInTheDocument();
  });

  it("未認証時にクリックするとログインボタンが表示される", async () => {
    mockSessionData = { data: null, status: "unauthenticated" };
    const user = userEvent.setup();
    render(<UserMenu />);
    await user.click(screen.getByLabelText("auth.guest"));
    expect(screen.getByText("auth.loginWithGoogle")).toBeInTheDocument();
  });

  it("ログインボタンをクリックするとsignInが呼ばれる", async () => {
    mockSessionData = { data: null, status: "unauthenticated" };
    const user = userEvent.setup();
    render(<UserMenu />);
    await user.click(screen.getByLabelText("auth.guest"));
    await user.click(screen.getByText("auth.loginWithGoogle"));
    expect(mockSignIn).toHaveBeenCalledWith("google");
  });

  it("認証済み時はアバター画像を表示する", () => {
    mockSessionData = {
      data: {
        user: { name: "Test User", image: "https://example.com/avatar.jpg" },
      },
      status: "authenticated",
    };
    render(<UserMenu />);
    const img = screen.getByAltText("Test User");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/avatar.jpg");
  });

  it("認証済み時にクリックするとログアウトボタンが表示される", async () => {
    mockSessionData = {
      data: { user: { name: "Test User", image: null } },
      status: "authenticated",
    };
    const user = userEvent.setup();
    render(<UserMenu />);
    await user.click(screen.getByLabelText("Test User"));
    expect(screen.getByText("auth.logout")).toBeInTheDocument();
  });

  it("ログアウトボタンをクリックするとsignOutが呼ばれる", async () => {
    mockSessionData = {
      data: { user: { name: "Test User", image: null } },
      status: "authenticated",
    };
    const user = userEvent.setup();
    render(<UserMenu />);
    await user.click(screen.getByLabelText("Test User"));
    await user.click(screen.getByText("auth.logout"));
    expect(mockSignOut).toHaveBeenCalled();
  });

  it("loading時はスケルトンを表示する", () => {
    mockSessionData = { data: null, status: "loading" };
    render(<UserMenu />);
    expect(screen.getByTestId("user-menu-skeleton")).toBeInTheDocument();
  });
});
