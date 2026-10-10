import { afterEach, describe, expect, it, vi } from "vitest";
import { sendMagicLinkEmail } from "../lib/mail";

const message = { identifier: "player@example.com", url: "https://app.example/api/auth/callback/resend?token=a&email=b" };

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("sendMagicLinkEmail", () => {
  it("prints the link instead of sending in development without an API key", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("NODE_ENV", "development");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    await sendMagicLinkEmail(message);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(info.mock.calls[0][0]).toContain(message.url);
  });

  it("fails loudly in production when the API key is missing", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("NODE_ENV", "production");

    await expect(sendMagicLinkEmail(message)).rejects.toThrow(/RESEND_API_KEY/);
  });

  it("posts the email to Resend with the configured sender and an escaped link", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("AUTH_EMAIL_FROM", "Spiel <login@spiel.example>");
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await sendMagicLinkEmail(message);

    const [endpoint, init] = fetchMock.mock.calls[0];
    expect(endpoint).toBe("https://api.resend.com/emails");
    expect(init.headers.Authorization).toBe("Bearer re_test_key");
    const body = JSON.parse(init.body);
    expect(body.from).toBe("Spiel <login@spiel.example>");
    expect(body.to).toBe("player@example.com");
    expect(body.text).toContain(message.url);
    expect(body.html).toContain("token=a&amp;email=b");
  });

  it("surfaces Resend errors so the player sees a failure instead of a silent no-mail", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("domain not verified", { status: 403 })));

    await expect(sendMagicLinkEmail(message)).rejects.toThrow(/403.*domain not verified/);
  });
});
