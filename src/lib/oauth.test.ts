import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { clearStoredState, getStoredState, startOAuthLogin } from "./oauth";

describe("OAuth helpers", () => {
  const originalLocation = window.location;

  afterAll(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  beforeEach(() => {
    localStorage.clear();

    // jsdom navigation throws on cross-origin redirects, so we replace location in tests.
    delete (window as unknown as { location?: Location }).location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...originalLocation,
        href: "http://localhost/",
      },
    });
  });

  it("ulozi state do localStorage pred presmerovanim", async () => {
    await startOAuthLogin();

    const storedState = getStoredState();
    expect(storedState).toBeTruthy();
    expect(storedState).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it("vytvori oauth authorize URL s pozadovanymi query parametry", async () => {
    await startOAuthLogin();

    const redirectUrl = window.location.href;
    const parsedUrl = new URL(redirectUrl);

    expect(parsedUrl.origin).toBe("https://wmmwsbrevzfeqzdrcbrc.supabase.co");
    expect(parsedUrl.pathname).toBe("/functions/v1/oauth-start");
    expect(parsedUrl.searchParams.get("state")).toBeTruthy();
    expect(parsedUrl.searchParams.get("origin")).toBe(window.location.origin);
  });

  it("clearStoredState odstrani ulozeny state", () => {
    localStorage.setItem("oauth_state", "abc-state");

    clearStoredState();

    expect(getStoredState()).toBeNull();
  });
});
