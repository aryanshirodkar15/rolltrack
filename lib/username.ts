// Shared username rules: 3-20 chars, lowercase letters, digits, underscores.
// Normalize before validating so "DungeonMaster" and "dungeonmaster" are the
// same handle.
export function normalizeUsername(raw: string) {
  return raw.trim().toLowerCase().replace(/^@/, "");
}

export function usernameError(username: string): string | null {
  if (username.length < 3 || username.length > 20) {
    return "Username must be 3-20 characters.";
  }
  if (!/^[a-z0-9_]+$/.test(username)) {
    return "Username can only use lowercase letters, numbers, and underscores.";
  }
  return null;
}

export const USERNAME_MAX = 20;

// Turn free text into something that satisfies the username rules.
export function slugifyUsername(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 16);
}

// A starting handle for an account that never picked one: their display
// name, else the local part of their email, else a generic fallback.
export function defaultUsernameBase(name: string | null, email: string): string {
  const fromName = slugifyUsername(name ?? "");
  if (fromName.length >= 3) return fromName;
  const fromEmail = slugifyUsername(email.split("@")[0] ?? "");
  if (fromEmail.length >= 3) return fromEmail;
  return "adventurer";
}

// First free handle for `base`, suffixing _2, _3 ... while staying inside
// the length limit. `taken` holds the usernames already in use.
export function uniqueUsername(base: string, taken: Set<string>): string {
  let candidate = base.slice(0, USERNAME_MAX);
  let n = 2;
  while (taken.has(candidate)) {
    const suffix = `_${n++}`;
    candidate = base.slice(0, USERNAME_MAX - suffix.length) + suffix;
  }
  return candidate;
}
