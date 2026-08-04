import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  // Unique handle for finding other players; lowercase letters, digits,
  // underscores. Nullable only for accounts predating usernames.
  username: text("username").unique(),
  // When the address was proven reachable. Null means the account exists but
  // cannot sign in yet.
  emailVerified: integer("email_verified"),
  passwordHash: text("password_hash").notNull(),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Single-use links emailed out: confirming an address, and resetting a
// forgotten password. Only a digest of the token is kept, so the table is
// useless to anyone who reads it.
export const authTokens = sqliteTable("auth_tokens", {
  tokenHash: text("token_hash").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  kind: text("kind").notNull(), // 'verify' | 'reset'
  expiresAt: integer("expires_at").notNull(),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// One row per campaign a user is logging. A campaign is the long-running
// table: "Honeycomb Academy", "Heroes of Askana". One-shots are campaigns
// with a single session.
export const campaigns = sqliteTable("campaigns", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  // Whose game it usually is. Sessions can override this per-night.
  dm: text("dm").notNull().default(""),
  system: text("system").notNull().default("D&D 5e"), // ruleset
  setting: text("setting").notNull().default(""), // world / homebrew name
  status: text("status").notNull().default("active"), // planned | active | finished | abandoned
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// One row per session played, mirroring one row of the tracking sheet.
// Derived columns from the sheet (Month, Day Break, PlayTime, Hours) are
// computed at read time, not stored.
export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  campaignId: text("campaign_id").notNull().references(() => campaigns.id),
  // Nth session of this campaign, in play order. Set when logged.
  sessionNumber: integer("session_number").notNull().default(1),
  date: text("date").notNull(), // ISO yyyy-mm-dd of the night played
  arc: text("arc").notNull().default(""), // story arc label, e.g. "Jewel of Askana"
  gameDays: integer("game_days"), // in-world days that passed that session
  level: integer("level"), // party level during the session
  summary: text("summary").notNull().default(""), // the recap
  dm: text("dm").notNull().default(""), // who ran it that night
  location: text("location").notNull().default(""), // where / "Online"
  players: text("players").notNull().default(""), // comma-separated who was there
  startTime: text("start_time"), // "HH:MM" local, optional
  endTime: text("end_time"), // "HH:MM" local, optional
  minutes: integer("minutes").notNull().default(0), // session length, the thing that adds up
  rating: real("rating"), // optional 1-10 for the night
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Rate-limit counters for the auth endpoints, keyed by scope:ip. Stored in
// the database so limits hold across serverless instances.
export const authAttempts = sqliteTable("auth_attempts", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  resetAt: integer("reset_at").notNull(),
});
