import { createHash, randomBytes } from "crypto";
import { db } from "@/db";
import { authTokens } from "@/db/schema";
import { and, eq, lt } from "drizzle-orm";

export type TokenKind = "verify" | "reset";

// A confirmation link is a password for the minute it lives, so only its
// digest is stored. Someone reading the table cannot use what they find.
const digest = (token: string) => createHash("sha256").update(token).digest("hex");

const TTL_MS: Record<TokenKind, number> = {
  verify: 24 * 60 * 60 * 1000, // a day to get around to it
  reset: 60 * 60 * 1000, // an hour: a live reset link is worth more to an attacker
};

// Issue a link token, replacing any earlier one of the same kind so an old
// email cannot be replayed after a new one is requested.
export async function issueToken(userId: string, kind: TokenKind): Promise<string> {
  await db
    .delete(authTokens)
    .where(and(eq(authTokens.userId, userId), eq(authTokens.kind, kind)));

  const token = randomBytes(32).toString("hex");
  await db.insert(authTokens).values({
    tokenHash: digest(token),
    userId,
    kind,
    expiresAt: Date.now() + TTL_MS[kind],
  });
  return token;
}

// Spend a token: valid once, then gone.
export async function consumeToken(
  token: string,
  kind: TokenKind
): Promise<{ userId: string } | null> {
  if (!token || token.length < 32) return null;
  const hash = digest(token);
  const row = await db
    .select()
    .from(authTokens)
    .where(and(eq(authTokens.tokenHash, hash), eq(authTokens.kind, kind)))
    .get();
  if (!row) return null;

  await db.delete(authTokens).where(eq(authTokens.tokenHash, hash));
  if (row.expiresAt < Date.now()) return null;
  return { userId: row.userId };
}

// Housekeeping: drop anything already expired.
export async function purgeExpiredTokens() {
  await db.delete(authTokens).where(lt(authTokens.expiresAt, Date.now()));
}
