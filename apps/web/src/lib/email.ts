import "server-only";

// Transactional email via Resend's REST API (DEV-76). No SDK — a single fetch.
// `from` is configurable so prod can use a verified domain
// (EMAIL_FROM="EndlessWorlds <invoices@endlessworlds.xyz>"); the default uses
// Resend's shared sender, which only delivers to the account owner until a
// domain is verified.

export type EmailAttachment = { filename: string; content: string /* base64 */ };

export type SendResult = { ok: boolean; id?: string; error?: string };

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
}): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: "Email isn't configured (RESEND_API_KEY missing)." };
  // Verified sending domain (mail.endlessworlds.xyz) — override per-env with EMAIL_FROM.
  const from = process.env.EMAIL_FROM || "EndlessWorlds <invoices@mail.endlessworlds.xyz>";

  let res: Response;
  try {
    res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        attachments: opts.attachments,
      }),
    });
  } catch (e) {
    return { ok: false, error: `Couldn't reach the email service: ${(e as Error).message}` };
  }

  const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
  if (!res.ok) return { ok: false, error: data?.message || `Email failed (HTTP ${res.status}).` };
  return { ok: true, id: data?.id };
}
