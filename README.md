# Rolltrack

A session log for tabletop campaigns. Log a campaign, add a session each
time you play, and watch the hours at the table add up, broken down by DM,
arc, and month.

It started life as a spreadsheet: one row per night, with the date, who ran
it, who showed up, and how long you played. This is that spreadsheet, made to
do the sums for you.

## What works right now

- **Email + password login** (Auth.js / NextAuth v5, JWT sessions, bcrypt
  hashing), with email confirmation and password reset over SMTP, plus
  optional Sign in with Google
- **Campaigns**: name, system, DM, setting, and a status you set yourself
  (planned / active / finished / abandoned)
- **Sessions**: one row per night, carrying the date, arc, party level, who
  ran it, where you played, who was at the table, and a recap of what happened
- **Real hours**: enter a start and end time and Rolltrack works out the
  length (past-midnight sessions roll over cleanly). Every stat is built from
  those minutes.
- **A stats dashboard**: total time at the table, session count, average
  session length, average days between games, hours behind the screen by DM,
  a month-by-month bar chart, your longest single session, who shows up most,
  and a per-campaign rollup
- **Per-campaign view**: hours played, session count, current party level, an
  arc-by-arc breakdown, and the full log of nights

Sessions store the length once, so a half-finished campaign contributes
honestly. Nothing is pre-aggregated: the dashboard is computed live from your
sessions every time you load it.

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Fill in `.env.local`:
   ```
   AUTH_SECRET=run_openssl_rand_base64_32_and_paste_here
   ```
   Generate the secret with: `openssl rand -base64 32`

   Leave the SMTP variables empty for local work and accounts are created
   already confirmed, so you never need an email provider to develop.

3. Run it:
   ```
   npm run dev
   ```

The database is a local SQLite file (`rolltrack.db`) in development, created
on first run. In production, point `TURSO_DATABASE_URL` and
`TURSO_AUTH_TOKEN` at a hosted libSQL database.

## Stack

Next.js (App Router) · React · Drizzle ORM over libSQL/SQLite · Auth.js
(NextAuth v5) · Tailwind CSS · Nodemailer.

## Notes

A personal, non-commercial hobby project. No ads, no payments, nothing for
sale. Not affiliated with or endorsed by Wizards of the Coast.
