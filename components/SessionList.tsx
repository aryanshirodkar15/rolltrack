"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDuration } from "@/lib/sessions";
import { splitNames } from "@/lib/stats";
import type { Session } from "@/lib/stats";

// Long date like "Sat 3 Jan 2026" from a yyyy-mm-dd string, in UTC so the day
// never shifts.
function prettyDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

// The campaign's nights, newest first. Each is a card; the small × removes it
// behind a confirm so a mis-tap can't wipe a session.
export default function SessionList({ sessions }: { sessions: Session[] }) {
  const router = useRouter();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function remove(id: string) {
    setBusyId(id);
    const res = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    setBusyId(null);
    setConfirmId(null);
    if (res.ok) router.refresh();
  }

  if (sessions.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--muted)" }}>
        No sessions logged yet. Add the first one above.
      </p>
    );
  }

  const ordered = [...sessions].sort((a, b) =>
    a.date === b.date ? b.sessionNumber - a.sessionNumber : a.date < b.date ? 1 : -1
  );

  return (
    <div className="space-y-3">
      {ordered.map((s) => (
        <article key={s.id} className="panel p-5">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span
              className="mono text-xs px-1.5 py-0.5 shrink-0"
              style={{ background: "var(--ink)", color: "var(--accent)", border: "1px solid var(--ink-line)" }}
            >
              #{s.sessionNumber}
            </span>
            <span className="text-sm font-semibold">{prettyDate(s.date)}</span>
            {s.arc && (
              <span className="text-xs" style={{ color: "var(--accent)" }}>
                {s.arc}
              </span>
            )}
            <span className="mono text-xs ml-auto tabular-nums" style={{ color: "var(--muted)" }}>
              {s.minutes > 0 ? formatDuration(s.minutes) : "--"}
              {s.level != null ? ` · lvl ${s.level}` : ""}
              {s.rating != null ? ` · ${s.rating}/10` : ""}
            </span>
          </div>

          {s.title && <p className="text-base font-semibold mt-2">{s.title}</p>}

          {s.summary && <p className="text-sm mt-3 leading-relaxed">{s.summary}</p>}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs" style={{ color: "var(--muted)" }}>
            {s.dm && <span>DM {s.dm}</span>}
            {s.location && <span>{s.location}</span>}
            {s.gameDays != null && <span>{s.gameDays} in-game days</span>}
            {splitNames(s.players).length > 0 && (
              <span>{splitNames(s.players).length} at the table</span>
            )}
            {confirmId === s.id ? (
              <span className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => remove(s.id)}
                  disabled={busyId === s.id}
                  className="chip text-[11px] px-2 py-0.5"
                  style={{ color: "var(--bad)" }}
                >
                  {busyId === s.id ? "..." : "Delete"}
                </button>
                <button onClick={() => setConfirmId(null)} className="chip text-[11px] px-2 py-0.5">
                  Keep
                </button>
              </span>
            ) : (
              <button
                onClick={() => setConfirmId(s.id)}
                className="ml-auto chip text-[11px] px-2 py-0.5"
                aria-label="Delete session"
              >
                Remove
              </button>
            )}
          </div>

          {splitNames(s.players).length > 0 && (
            <p className="text-xs mt-2" style={{ color: "var(--muted)", opacity: 0.8 }}>
              {splitNames(s.players).join(" · ")}
            </p>
          )}
        </article>
      ))}
    </div>
  );
}
