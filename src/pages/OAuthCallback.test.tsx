import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  setSessionMock: vi.fn(),
  clearStoredStateMock: vi.fn(),
  getStoredStateMock: vi.fn(),
  getSupabaseUrlMock: vi.fn(),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mocked.navigateMock,
  };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      setSession: mocked.setSessionMock,
    },
  },
}));

vi.mock("@/lib/oauth", () => ({
  clearStoredState: mocked.clearStoredStateMock,
  getStoredState: mocked.getStoredStateMock,
  getSupabaseUrl: mocked.getSupabaseUrlMock,
}));

import OAuthCallback from "./OAuthCallback";

describe("OAuthCallback", () => {
  beforeEach(() => {
    mocked.navigateMock.mockReset();
    mocked.setSessionMock.mockReset();
    mocked.clearStoredStateMock.mockReset();
    mocked.getStoredStateMock.mockReset();
    mocked.getSupabaseUrlMock.mockReset();

    mocked.getStoredStateMock.mockReturnValue("ok-state");
    mocked.getSupabaseUrlMock.mockReturnValue("https://wmmwsbrevzfeqzdrcbrc.supabase.co");

    window.history.replaceState({}, "", "/oauth");
  });

  it("zobrazi chybu z query parametru a vycisti state", async () => {
    window.history.replaceState({}, "", "/oauth?error=invalid_state");

    render(<OAuthCallback />);

    expect(await screen.findByText("Chyba přihlášení")).toBeInTheDocument();
    expect(screen.getByText("Neplatný nebo expirovaný state")).toBeInTheDocument();
    expect(mocked.clearStoredStateMock).toHaveBeenCalledTimes(1);
    expect(mocked.setSessionMock).not.toHaveBeenCalled();
  });

  it("zobrazi invalid state pro code callback bez odpovidajiciho local state", async () => {
    mocked.getStoredStateMock.mockReturnValue(null);
    window.history.replaceState({}, "", "/oauth?code=abc123&state=ok-state");

    render(<OAuthCallback />);

    expect(await screen.findByText("Chyba přihlášení")).toBeInTheDocument();
    expect(screen.getByText("Neplatný nebo expirovaný state")).toBeInTheDocument();
    expect(mocked.clearStoredStateMock).toHaveBeenCalledTimes(1);
  });

  it("nastavi session z hash tokenu a presmeruje na hlavni stranku", async () => {
    mocked.setSessionMock.mockResolvedValue({ error: null });
    window.history.replaceState({}, "", "/oauth#access_token=acc123&refresh_token=ref123");

    render(<OAuthCallback />);

    await waitFor(() => {
      expect(mocked.setSessionMock).toHaveBeenCalledWith({
        access_token: "acc123",
        refresh_token: "ref123",
      });
    });

    expect(mocked.clearStoredStateMock).toHaveBeenCalledTimes(1);
    expect(mocked.navigateMock).toHaveBeenCalledWith("/", { replace: true });
  });

  it("zobrazi chybu pri chybejicich tokenech", async () => {
    window.history.replaceState({}, "", "/oauth");

    render(<OAuthCallback />);

    expect(await screen.findByText("Chyba přihlášení")).toBeInTheDocument();
    expect(screen.getByText("Chybí přihlašovací tokeny")).toBeInTheDocument();
    expect(mocked.clearStoredStateMock).toHaveBeenCalledTimes(1);
  });
});
