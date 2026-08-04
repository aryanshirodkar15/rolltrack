import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { issueToken } from "@/lib/authTokens";
import { emailConfigured, sendEmail, emailShell, appUrl } from "@/lib/email";
import { clientIp, isRateLimited, recordAttempt, rateKey } from "@/lib/ratelimit";

// Start a password reset.
export async function POST(req: Request) {
  if (!emailConfigured()) {
    return NextResponse.json(
      { error: "Password resets are unavailable right now." },
      { status: 503 }
    );
  }

  const ipKey = rateKey("forgot", clientIp(req));
  if (await isRateLimited(ipKey, 10)) {
    return NextResponse.json(
      { error: "Too many reset requests. Wait a few minutes and try again." },
      { status: 429 }
    );
  }
  await recordAttempt(ipKey, 15 * 60 * 1000);

  const { email } = (await req.json().catch(() => ({}))) as { email?: string };
  const normalized = String(email ?? "").toLowerCase().trim();

  // Identical response whether or not the account exists: otherwise this
  // endpoint tells anyone who asks which addresses are registered.
  const generic = NextResponse.json({
    ok: true,
    message: "If an account uses that address, a reset link is on its way.",
  });

  const user = await db.select().from(users).where(eq(users.email, normalized)).get();
  if (!user) return generic;

  const token = await issueToken(user.id, "reset");
  await sendEmail({
    to: user.email,
    subject: "Reset your Rolltrack password",
    html: emailShell({
      heading: "Reset your password",
      body: "Someone asked to reset the password on your Rolltrack account. Use the button below to choose a new one.",
      buttonLabel: "Choose a new password",
      buttonUrl: `${appUrl()}/reset?token=${token}`,
      footnote:
        "This link works once and expires in an hour. If you did not ask for it, ignore this email; your password stays as it is.",
    }),
  });
  return generic;
}
