// Time helpers for turning "we started at 7:30 and wrapped at 11:45" into a
// clean minute count, the number every stat is built on.

// "HH:MM" -> minutes past midnight, or null if it isn't a real time.
export function timeToMinutes(hhmm: string | null | undefined): number | null {
  if (!hhmm) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

// Session length from a start and end time. A table that runs past midnight
// (end earlier than start) rolls over a day rather than going negative.
export function durationMinutes(
  start: string | null | undefined,
  end: string | null | undefined
): number | null {
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  if (s == null || e == null) return null;
  const diff = e - s;
  return diff >= 0 ? diff : diff + 24 * 60;
}

// "7h 30m" from a minute count. Zero minutes reads as "0m", not "0h 0m".
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// Decimal hours, one place, for tables that echo the spreadsheet's Hours
// column (a 210-minute night reads as 3.5).
export function hoursValue(minutes: number): number {
  return Math.round((minutes / 60) * 10) / 10;
}

// A yyyy-mm-dd string as a UTC date, so day-count math never drifts by a
// timezone hour. Returns null for anything unparseable.
export function parseDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return isNaN(d.getTime()) ? null : d;
}

// Whole days between two ISO dates.
export function daysBetween(aIso: string, bIso: string): number | null {
  const a = parseDate(aIso);
  const b = parseDate(bIso);
  if (!a || !b) return null;
  return Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));
}
