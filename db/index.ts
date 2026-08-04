import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { defaultUsernameBase, uniqueUsername } from "@/lib/username";

// Local file database in development; Turso (hosted libSQL) in production,
// where serverless filesystems are ephemeral. Set TURSO_DATABASE_URL and
// TURSO_AUTH_TOKEN in the deployment environment.
const client = createClient({
  url: process.env.TURSO_DATABASE_URL ?? "file:rolltrack.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });

// Create tables on first run if they don't exist. Simple approach for a
// small app; swap for real drizzle-kit migrations later. Skipped during
// `next build`, where parallel page-data workers would contend for the DB.
if (process.env.NEXT_PHASE !== "phase-production-build") {
  if (!process.env.TURSO_DATABASE_URL) {
    // Local file mode: tolerate concurrent processes (dev server + scripts).
    await client.execute("PRAGMA busy_timeout = 10000");
    await client.execute("PRAGMA journal_mode = WAL");
  }
  await client.executeMultiple(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  username TEXT,
  email_verified INTEGER,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS auth_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  kind TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  dm TEXT NOT NULL DEFAULT '',
  system TEXT NOT NULL DEFAULT 'D&D 5e',
  setting TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  session_number INTEGER NOT NULL DEFAULT 1,
  date TEXT NOT NULL,
  arc TEXT NOT NULL DEFAULT '',
  game_days INTEGER,
  level INTEGER,
  summary TEXT NOT NULL DEFAULT '',
  dm TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  players TEXT NOT NULL DEFAULT '',
  start_time TEXT,
  end_time TEXT,
  minutes INTEGER NOT NULL DEFAULT 0,
  rating REAL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS auth_attempts (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  reset_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_campaign ON sessions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_user ON campaigns(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);
`);

  // Give every account a handle. Signup requires one, so this only ever
  // catches accounts made before usernames existed; once they all have one
  // the select comes back empty and this costs nothing.
  const legacy = await client.execute(
    "SELECT id, name, email FROM users WHERE username IS NULL OR trim(username) = ''"
  );
  if (legacy.rows.length > 0) {
    const existing = await client.execute(
      "SELECT username FROM users WHERE username IS NOT NULL AND trim(username) != ''"
    );
    const taken = new Set(existing.rows.map((r) => String(r.username)));
    for (const row of legacy.rows) {
      const base = defaultUsernameBase(
        row.name == null ? null : String(row.name),
        String(row.email ?? "")
      );
      const username = uniqueUsername(base, taken);
      taken.add(username);
      try {
        await client.execute({
          sql: "UPDATE users SET username = ? WHERE id = ?",
          args: [username, String(row.id)],
        });
      } catch {
        // Another instance won the race for this handle; it'll get one on
        // the next boot rather than blocking startup.
      }
    }
  }
}
