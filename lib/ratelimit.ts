import { createHash } from "crypto";
import { db } from "@/db";
import { authAttempts } from "@/db/schema";
import { eq } from "drizzle-orm";

// Fixed-window rate limiting backed by the database, so it holds across
// serverless instances. Split into a check and a record step so callers can
// choose to count every attempt (signups) or only failures (logins).
//
// Limits assume whole offices, classes, and campuses share one address, so
// anything keyed on the network alone has to be loose enough for a room of
// real people while still stopping a bot farm.

// Signups from one network. A group signing up together is normal; hundreds
// is not.
export const SIGNUPS_PER_IP = 40;
export const SIGNUP_WINDOW_MS = 60 * 60 * 1000;

// Failed logins for one account. This is the real brute-force guard, since
// guessing targets a specific person.
export const LOGIN_FAILS_PER_ACCOUNT = 10;
// Failed logins from one network, across all accounts. Deliberately high:
// 25 colleagues fumbling passwords must never lock each other out. It only
// exists to catch someone spraying guesses across many accounts at once.
export const LOGIN_FAILS_PER_IP = 60;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

// Key on a digest rather than the address or email itself, so the counter
// table never becomes a second copy of who signed in from where.
export function rateKey(scope: string, value: string): string {
  const digest = createHash("sha256").update(value.toLowerCase()).digest("hex").slice(0, 24);
  return `${scope}:${digest}`;
}

export async function isRateLimited(key: string, max: number): Promise<boolean> {
  const row = await db.select().from(authAttempts).where(eq(authAttempts.key, key)).get();
  return !!row && row.resetAt > Date.now() && row.count >= max;
}

export async function recordAttempt(key: string, windowMs: number) {
  const now = Date.now();
  const row = await db.select().from(authAttempts).where(eq(authAttempts.key, key)).get();
  if (!row || row.resetAt <= now) {
    await db
      .insert(authAttempts)
      .values({ key, count: 1, resetAt: now + windowMs })
      .onConflictDoUpdate({
        target: authAttempts.key,
        set: { count: 1, resetAt: now + windowMs },
      });
  } else {
    await db
      .update(authAttempts)
      .set({ count: row.count + 1 })
      .where(eq(authAttempts.key, key));
  }
}
