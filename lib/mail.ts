const DEFAULT_FROM = "Boardroom <onboarding@resend.dev>";
const RESEND_ENDPOINT = "https://api.resend.com/emails";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * Sends the magic-link email through Resend's HTTP API. Without an API key
 * the link is printed to the server console in development; in production a
 * missing key is a configuration error that must fail loudly.
 */
export async function sendMagicLinkEmail({ identifier, url }: { identifier: string; url: string }) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY is not set; cannot send magic link emails.");
    }
    console.info(`\n[auth] Magic link for ${identifier} (no RESEND_API_KEY set):\n${url}\n`);
    return;
  }

  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.AUTH_EMAIL_FROM ?? DEFAULT_FROM,
      to: identifier,
      subject: "Dein Login-Link für Boardroom",
      text: `Öffne diesen Link, um dich anzumelden:\n${url}\n\nWenn du das nicht angefordert hast, ignoriere diese E-Mail.`,
      html: `<p>Tippe auf den Button, um dich anzumelden:</p><p><a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 20px;background:#2563eb;color:#fff;border-radius:10px;text-decoration:none;font-weight:600">Jetzt anmelden</a></p><p style="color:#71717a;font-size:13px">Wenn du das nicht angefordert hast, ignoriere diese E-Mail.</p>`,
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend API error ${response.status}: ${await response.text()}`);
  }
}
