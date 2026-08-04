import { randomUUID } from "crypto";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { defaultUsernameBase, uniqueUsername } from "@/lib/username";

// Google accounts have no password. The users table predates them and
// requires the column, so they get an empty string rather than a risky
// NOT NULL migration on a live database. Empty is falsy, which is exactly
// the check the credentials flow needs: no password means no password login.
export const NO_PASSWORD = "";

export function hasPassword(hash: string | null | undefined): boolean {
  return Boolean(hash && hash.length > 0);
}

// Find or create the account behind a Google sign-in, and return its id.
export async function upsertGoogleUser(
  email: string,
  displayName?: string | null
): Promise<string | null> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return null;

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .get();

  if (existing) {
    const changes: Record<string, unknown> = {};

    // Google has proved they own the address, so trust it over our own
    // pending confirmation.
    if (!existing.emailVerified) changes.emailVerified = Date.now();

    // Someone could have registered this address with a password and never
    // confirmed it, which would leave that password working on an account
    // its real owner just proved is theirs. Retire it; they can set a new
    // one through the reset flow if they ever want password sign-in.
    if (!existing.emailVerified && hasPassword(existing.passwordHash)) {
      changes.passwordHash = NO_PASSWORD;
    }

    // Backfill a handle for accounts that predate usernames.
    if (!existing.username) {
      const taken = new Set(
        (await db.select({ username: users.username }).from(users).all())
          .map((u) => u.username)
          .filter((u): u is string => Boolean(u))
      );
      changes.username = uniqueUsername(
        defaultUsernameBase(displayName ?? existing.name, normalizedEmail),
        taken
      );
    }

    if (Object.keys(changes).length > 0) {
      await db.update(users).set(changes).where(eq(users.id, existing.id));
    }
    return existing.id;
  }

  const taken = new Set(
    (await db.select({ username: users.username }).from(users).all())
      .map((u) => u.username)
      .filter((u): u is string => Boolean(u))
  );
  const username = uniqueUsername(
    defaultUsernameBase(displayName ?? null, normalizedEmail),
    taken
  );

  const id = randomUUID();
  await db.insert(users).values({
    id,
    name: (displayName ?? "").trim() || normalizedEmail.split("@")[0],
    email: normalizedEmail,
    username,
    passwordHash: NO_PASSWORD,
    // No confirmation email: Google already verified this address.
    emailVerified: Date.now(),
  });
  return id;
}
