import nodemailer from "nodemailer";

// Transactional email through Brevo's SMTP relay. Brevo is here because it
// can send from one verified address (a personal inbox) with no domain of
// our own, which keeps the project free. SMTP rather than their REST API
// because an SMTP key is what the relay hands you.
//
// Host and port are overridable so tests can catch mail instead of sending.
const SMTP_HOST = process.env.SMTP_HOST ?? "smtp-relay.brevo.com";
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 587);

export function emailConfigured(): boolean {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_KEY && process.env.EMAIL_FROM);
}

// Where links in emails should point. Set APP_URL in production; Vercel's
// own variable is the fallback, and localhost keeps development working.
export function appUrl(): string {
  const configured = process.env.APP_URL?.replace(/\/$/, "");
  if (configured) return configured;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = process.env.SMTP_USER;
  const key = process.env.SMTP_KEY;
  const from = process.env.EMAIL_FROM;
  if (!user || !key || !from) return { ok: false, error: "Email is not configured." };

  try {
    const transport = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: false, // STARTTLS upgrades the connection on 587
      auth: { user, pass: key },
    });
    await transport.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME ?? "Rolltrack"}" <${from}>`,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    return { ok: true };
  } catch (err) {
    // Worth surfacing: an unverified sender fails here, and the message says so.
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not reach the email provider.",
    };
  }
}

// One plain house style for both emails, so they read as the same app.
export function emailShell(opts: {
  heading: string;
  body: string;
  buttonLabel: string;
  buttonUrl: string;
  footnote: string;
}): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#14110d;font-family:Helvetica,Arial,sans-serif;color:#ece2ce;">
    <table role="presentation" style="max-width:520px;margin:0 auto;background:#1e1a13;border:1px solid #342e23;">
      <tr><td style="padding:28px;">
        <p style="margin:0 0 20px;font-size:18px;font-weight:bold;letter-spacing:1px;color:#ece2ce;">
          ROLL<span style="color:#c99a4a;">TRACK</span>
        </p>
        <h1 style="margin:0 0 12px;font-size:22px;color:#ece2ce;">${opts.heading}</h1>
        <p style="margin:0 0 22px;font-size:14px;line-height:1.6;color:#9a8f78;">${opts.body}</p>
        <a href="${opts.buttonUrl}"
           style="display:inline-block;padding:12px 22px;background:#c99a4a;color:#14110d;font-size:14px;font-weight:bold;text-decoration:none;">
          ${opts.buttonLabel}
        </a>
        <p style="margin:22px 0 0;font-size:12px;line-height:1.6;color:#9a8f78;">${opts.footnote}</p>
        <p style="margin:14px 0 0;font-size:11px;line-height:1.6;color:#6f6656;word-break:break-all;">
          If the button does not work, paste this into your browser:<br />${opts.buttonUrl}
        </p>
      </td></tr>
    </table>
    <p style="max-width:520px;margin:14px auto 0;font-size:11px;color:#6f6656;text-align:center;">
      Rolltrack is a personal, non-commercial hobby project.
    </p>
  </body>
</html>`;
}
