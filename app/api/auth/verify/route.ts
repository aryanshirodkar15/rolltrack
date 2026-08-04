import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { consumeToken, issueToken } from "@/lib/authTokens";
import { emailConfigured, sendEmail, emailShell, appUrl } from "@/lib/email";
import { clientIp, isRateLimited, recordAttempt, rateKey } from "@/lib/ratelimit";

// Spend a confirmation link.
export async function POST(req: Request) {
  const { token } = (await req.json().catch(() => ({}))) as { token?: string };
  const claim = await consumeToken(String(token ?? ""), "verify");
  if (!claim) {
    return NextResponse.json(
      { error: "That confirmation link is invalid or has expired. Request a new one below." },
      { status: 400 }
    );
  }

  const user = await db.select().from(users).where(eq(users.id, claim.userId)).get();
  if (!user) return NextResponse.json({ error: "Account no longer exists." }, { status: 404 });

  if (user.emailVerified == null) {
    await db.update(users).set({ emailVerified: Date.now() }).where(eq(users.id, user.id));
  }
  return NextResponse.json({ ok: true, email: user.email });
}

// Send another confirmation link.
export async function PUT(req: Request) {
  if (!emailConfigured()) {
    return NextResponse.json({ error: "Email is not configured." }, { status: 503 });
  }

  // Someone else's address should not be mailable on demand from here.
  const ipKey = rateKey("resend-verify", clientIp(req));
  if (await isRateLimited(ipKey, 5)) {
    return NextResponse.json(
      { error: "Too many requests. Wait a few minutes and try again." },
      { status: 429 }
    );
  }
  await recordAttempt(ipKey, 15 * 60 * 1000);

  const { email } = (await req.json().catch(() => ({}))) as { email?: string };
  const normalized = String(email ?? "").toLowerCase().trim();
  const user = await db.select().from(users).where(eq(users.email, normalized)).get();

  // Always the same answer, so this cannot be used to find out who has an
  // account here.
  const generic = NextResponse.json({
    ok: true,
    message: "If that address needs confirming, a new link is on its way.",
  });
  if (!user || user.emailVerified != null) return generic;

  const token = await issueToken(user.id, "verify");
  await sendEmail({
    to: user.email,
    subject: "Confirm your email for Rolltrack",
    html: emailShell({
      heading: "Confirm your email",
      body: "Here is a fresh link to confirm your address and finish setting up your Rolltrack account.",
      buttonLabel: "Confirm my email",
      buttonUrl: `${appUrl()}/verify?token=${token}`,
      footnote: "This link works once and expires in 24 hours. If you did not ask for it, ignore this email.",
    }),
  });
  return generic;
}
