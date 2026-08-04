import type { InferSelectModel } from "drizzle-orm";
import type { campaigns, sessions } from "@/db/schema";
import { daysBetween, parseDate } from "@/lib/sessions";

export type Campaign = InferSelectModel<typeof campaigns>;
export type Session = InferSelectModel<typeof sessions>;

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// Split "Madi, Utsav, Sayer" into trimmed names, dropping blanks.
export function splitNames(raw: string): string[] {
  return raw
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);
}

// The whole-log summary that drives the dashboard. Everything here is
// computed from the sessions themselves; nothing is stored pre-aggregated.
export function summarize(all: Session[], campaignList: Campaign[] = []) {
  const totalMinutes = all.reduce((sum, s) => sum + s.minutes, 0);
  const sessionCount = all.length;

  const withTime = all.filter((s) => s.minutes > 0);
  const longest = [...withTime].sort((a, b) => b.minutes - a.minutes)[0] ?? null;
  const shortest = [...withTime].sort((a, b) => a.minutes - b.minutes)[0] ?? null;
  const avgSessionMinutes =
    withTime.length > 0
      ? Math.round(withTime.reduce((s, x) => s + x.minutes, 0) / withTime.length)
      : 0;

  // Average gap between game nights: sort the dates, diff each neighbour.
  const dates = all
    .map((s) => s.date)
    .filter((d) => parseDate(d))
    .sort();
  let gapSum = 0;
  let gapCount = 0;
  for (let i = 1; i < dates.length; i++) {
    const gap = daysBetween(dates[i - 1], dates[i]);
    if (gap != null && gap >= 0) {
      gapSum += gap;
      gapCount++;
    }
  }
  const avgDaysBetween = gapCount > 0 ? Math.round((gapSum / gapCount) * 10) / 10 : null;

  // Hours behind the screen, by DM. This is the "where the hours went"
  // breakdown, the D&D answer to Watchtrack's genre bars.
  const dmMinutes = new Map<string, number>();
  for (const s of all) {
    const dm = s.dm.trim() || "Unknown";
    dmMinutes.set(dm, (dmMinutes.get(dm) ?? 0) + s.minutes);
  }
  const hoursByDM = [...dmMinutes.entries()]
    .filter(([, mins]) => mins > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([name, minutes]) => ({ name, minutes }));

  // Nights at the table, per player, by attendance. A leaderboard of who
  // actually shows up.
  const attendance = new Map<string, number>();
  for (const s of all) {
    for (const p of splitNames(s.players)) {
      attendance.set(p, (attendance.get(p) ?? 0) + 1);
    }
  }
  const topPlayers = [...attendance.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  // Per-campaign rollup, richest first, carrying the latest known level.
  const byCampaign = campaignList
    .map((c) => {
      const own = all.filter((s) => s.campaignId === c.id);
      const minutes = own.reduce((sum, s) => sum + s.minutes, 0);
      const latest = [...own].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
      return {
        id: c.id,
        name: c.name,
        status: c.status,
        sessionCount: own.length,
        minutes,
        latestLevel: latest?.level ?? null,
        lastPlayed: latest?.date ?? null,
      };
    })
    .sort((a, b) => b.minutes - a.minutes);

  return {
    totalMinutes,
    totalHours: Math.floor(totalMinutes / 60),
    totalDays: Math.round((totalMinutes / 1440) * 10) / 10,
    sessionCount,
    campaignCount: campaignList.length,
    activeCampaigns: campaignList.filter((c) => c.status === "active").length,
    longest,
    shortest,
    avgSessionMinutes,
    avgDaysBetween,
    hoursByDM,
    topPlayers,
    byCampaign,
  };
}

// Minutes played per calendar month of one year, always twelve buckets so the
// chart keeps its shape even for a quiet month.
export function minutesByMonth(all: Session[], year: number) {
  const buckets = new Array(12).fill(0);
  for (const s of all) {
    const d = parseDate(s.date);
    if (d && d.getUTCFullYear() === year) buckets[d.getUTCMonth()] += s.minutes;
  }
  return buckets.map((minutes, i) => ({ month: MONTHS[i], minutes }));
}

// Which years the log actually covers, newest first, for a year switcher.
export function loggedYears(all: Session[]): number[] {
  const years = new Set<number>();
  for (const s of all) {
    const d = parseDate(s.date);
    if (d) years.add(d.getUTCFullYear());
  }
  return [...years].sort((a, b) => b - a);
}

// Per-arc breakdown within a single campaign: session count and hours, in the
// order the arcs first appear.
export function arcBreakdown(campaignSessions: Session[]) {
  const order: string[] = [];
  const map = new Map<string, { sessionCount: number; minutes: number }>();
  for (const s of campaignSessions) {
    const arc = s.arc.trim() || "Unsorted";
    if (!map.has(arc)) {
      map.set(arc, { sessionCount: 0, minutes: 0 });
      order.push(arc);
    }
    const row = map.get(arc)!;
    row.sessionCount++;
    row.minutes += s.minutes;
  }
  return order.map((arc) => ({ arc, ...map.get(arc)! }));
}
