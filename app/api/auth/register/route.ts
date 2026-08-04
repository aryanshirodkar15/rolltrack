import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { normalizeUsername, usernameError } from "@/lib/username";
import {
  clientIp,
  isRateLimited,
  recordAttempt,
  rateKey,
  SIGNUPS_PER_IP,
  SIGNUP_WINDOW_MS,
} from "@/lib/ratelimit";
import { emailProblem } from "@/lib/disposableEmail";
import { emailConfigured, sendEmail, emailShell, appUrl } from "@/lib/email";
import { issueToken } from "@/lib/authTokens";

export async function POST(req: Request) {
  // Throttle signups per network to stop bulk account creation, with enough
  // headroom that a whole table signing up together, retries and typos
  // included, never hits it.
  const ipKey = rateKey("register", clientIp(req));
  if (await isRateLimited(ipKey, SIGNUPS_PER_IP)) {
    return NextResponse.json(
      {
        error:
          "This network has hit the hourly signup limit. Wait an hour, or try from another connection.",
      },
      { status: 429 }
    );
  }
  await recordAttempt(ipKey, SIGNUP_WINDOW_MS);

  const { name, email, username, password } = await req.json();

  if (!name || !email || !username || !password) {
    return NextResponse.json({ error: "Missing fields." }, { status: 400 });
  }
  if (typeof password !== "string" || password.length < 8 || password.length > 128) {
    return NextResponse.json(
      { error: "Password must be 8-128 characters." },
      { status: 400 }
    );
  }
  if (String(name).trim().length === 0 || String(name).length > 60) {
    return NextResponse.json({ error: "Name must be 1-60 characters." }, { status: 400 });
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  if (normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizedEmail)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  const emailIssue = emailProblem(normalizedEmail);
  if (emailIssue) {
    return NextResponse.json({ error: emailIssue }, { status: 400 });
  }
  const normalizedUsername = normalizeUsername(String(username));
  const usernameProblem = usernameError(normalizedUsername);
  if (usernameProblem) {
    return NextResponse.json({ error: usernameProblem }, { status: 400 });
  }

  const existingEmail = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .get();
  if (existingEmail) {
    return NextResponse.json(
      { error: "An account with that email already exists." },
      { status: 409 }
    );
  }

  const existingUsername = await db
    .select()
    .from(users)
    .where(eq(users.username, normalizedUsername))
    .get();
  if (existingUsername) {
    return NextResponse.json(
      { error: "That username is taken. Try another." },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const id = randomUUID();

  // Without an email provider configured there is no way to confirm an
  // address, so accounts are created usable rather than stranded.
  const mustVerify = emailConfigured();

  await db.insert(users).values({
    id,
    name,
    email: normalizedEmail,
    username: normalizedUsername,
    passwordHash,
    emailVerified: mustVerify ? null : Date.now(),
  });

  if (!mustVerify) return NextResponse.json({ ok: true, verificationRequired: false });

  const token = await issueToken(id, "verify");
  const link = `${appUrl()}/verify?token=${token}`;
  const sent = await sendEmail({
    to: normalizedEmail,
    subject: "Confirm your email for Rolltrack",
    html: emailShell({
      heading: "Confirm your email",
      body: `Hi ${String(name).trim()}, confirm this address to finish setting up your Rolltrack account and start logging your sessions.`,
      buttonLabel: "Confirm my email",
      buttonUrl: link,
      footnote:
        "This link works once and expires in 24 hours. If you did not sign up, ignore this email and nothing happens.",
    }),
  });

  if (!sent.ok) {
    // A confirmation that never arrives is an account nobody can reach, so
    // remove it and let them try again rather than leave it stranded.
    await db.delete(users).where(eq(users.id, id));
    return NextResponse.json(
      { error: "Could not send the confirmation email. Check the address and try again." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, verificationRequired: true, email: normalizedEmail });
}
