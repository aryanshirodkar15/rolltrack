"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { durationMinutes, formatDuration } from "@/lib/sessions";
import type { Session } from "@/lib/stats";

type CampaignOption = { id: string; name: string; dm: string };

// Today as yyyy-mm-dd in the viewer's own timezone, for the date default.
function todayISO(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

const str = (v: number | null | undefined) => (v != null ? String(v) : "");

// The session form, in two modes. With no `editSession` it logs a new night
// (POST) and keeps the sticky context so logging several in a row is quick.
// With `editSession` it edits that night in place (PATCH) and closes via
// `onDone`. The field markup is shared so both modes always match.
export default function SessionForm({
  campaigns,
  fixedCampaignId,
  defaults,
  editSession,
  onDone,
}: {
  campaigns: CampaignOption[];
  fixedCampaignId?: string;
  defaults?: { dm?: string; level?: number | null; arc?: string; players?: string };
  editSession?: Session;
  onDone?: () => void;
}) {
  const router = useRouter();
  const isEdit = Boolean(editSession);

  const [campaignId, setCampaignId] = useState(
    editSession?.campaignId ?? fixedCampaignId ?? campaigns[0]?.id ?? ""
  );
  const [title, setTitle] = useState(editSession?.title ?? "");
  const [date, setDate] = useState(editSession?.date ?? todayISO());
  const [sessionNumber, setSessionNumber] = useState(
    editSession ? String(editSession.sessionNumber) : ""
  );
  const [startTime, setStartTime] = useState(editSession?.startTime ?? "");
  const [endTime, setEndTime] = useState(editSession?.endTime ?? "");
  const [level, setLevel] = useState(
    editSession ? str(editSession.level) : str(defaults?.level)
  );
  const [gameDays, setGameDays] = useState(editSession ? str(editSession.gameDays) : "");
  const [arc, setArc] = useState(editSession?.arc ?? defaults?.arc ?? "");
  const [dm, setDm] = useState(editSession?.dm ?? defaults?.dm ?? "");
  const [location, setLocation] = useState(editSession?.location ?? "");
  const [players, setPlayers] = useState(editSession?.players ?? defaults?.players ?? "");
  const [summary, setSummary] = useState(editSession?.summary ?? "");
  const [rating, setRating] = useState(editSession ? str(editSession.rating) : "");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);

  const derived = durationMinutes(startTime, endTime);

  async function submit() {
    if (pending) return;
    if (!campaignId) {
      setError("Pick a campaign first.");
      return;
    }
    setPending(true);
    setError("");
    setSaved(false);

    const payload = {
      title,
      date,
      startTime,
      endTime,
      level,
      gameDays,
      arc,
      dm,
      location,
      players,
      summary,
      rating,
      // Only send a session number when set, so blanking it in an edit leaves
      // the existing one alone rather than tripping validation.
      ...(sessionNumber ? { sessionNumber } : {}),
    };

    const res = await fetch(
      isEdit ? `/api/sessions/${editSession!.id}` : "/api/sessions",
      {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? payload : { campaignId, ...payload }),
      }
    );
    const d = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(d.error ?? (isEdit ? "Could not save the changes." : "Could not log the session."));
      return;
    }

    router.refresh();
    if (isEdit) {
      onDone?.();
      return;
    }
    // Keep the sticky context (campaign, DM, arc, players, level) so logging
    // several nights in a row stays quick; clear the per-night fields.
    setTitle("");
    setSessionNumber("");
    setStartTime("");
    setEndTime("");
    setGameDays("");
    setSummary("");
    setRating("");
    setSaved(true);
  }

  const label = "block text-xs uppercase tracking-widest mb-2 mono";
  const showPicker = !isEdit && !fixedCampaignId;

  return (
    <div className="frame panel p-6">
      <div className="grid sm:grid-cols-2 gap-4">
        {showPicker && (
          <div className="sm:col-span-2">
            <label className={label} style={{ color: "var(--muted)" }}>
              Campaign
            </label>
            {campaigns.length > 0 ? (
              <select
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
                className="field"
              >
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                Create a campaign first, then log a session into it.
              </p>
            )}
          </div>
        )}

        <div className="sm:col-span-2">
          <label className={label} style={{ color: "var(--muted)" }}>
            Title <span className="opacity-60">(optional)</span>
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Name this night, e.g. The Swamp Hive"
            className="field"
          />
        </div>

        <div>
          <label className={label} style={{ color: "var(--muted)" }}>
            Date
          </label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="field" />
        </div>
        <div>
          <label className={label} style={{ color: "var(--muted)" }}>
            Session # <span className="opacity-60">(auto if blank)</span>
          </label>
          <input
            type="number"
            min="1"
            value={sessionNumber}
            onChange={(e) => setSessionNumber(e.target.value)}
            placeholder="next in the run"
            className="field"
          />
        </div>

        <div>
          <label className={label} style={{ color: "var(--muted)" }}>
            Start
          </label>
          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="field" />
        </div>
        <div>
          <label className={label} style={{ color: "var(--muted)" }}>
            End
          </label>
          <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="field" />
        </div>

        <div className="sm:col-span-2 -mt-1">
          <p className="mono text-xs" style={{ color: derived != null ? "var(--accent)" : "var(--muted)" }}>
            {derived != null
              ? `That's ${formatDuration(derived)} at the table.`
              : "Enter a start and end time and the length fills in."}
          </p>
        </div>

        <div>
          <label className={label} style={{ color: "var(--muted)" }}>
            Party level
          </label>
          <input
            type="number"
            min="1"
            max="30"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="field"
          />
        </div>
        <div>
          <label className={label} style={{ color: "var(--muted)" }}>
            In-game days
          </label>
          <input
            type="number"
            min="0"
            value={gameDays}
            onChange={(e) => setGameDays(e.target.value)}
            placeholder="days that passed in the story"
            className="field"
          />
        </div>

        <div className="sm:col-span-2">
          <label className={label} style={{ color: "var(--muted)" }}>
            Arc
          </label>
          <input
            value={arc}
            onChange={(e) => setArc(e.target.value)}
            placeholder="Jewel of Askana"
            className="field"
          />
        </div>

        <div>
          <label className={label} style={{ color: "var(--muted)" }}>
            DM
          </label>
          <input value={dm} onChange={(e) => setDm(e.target.value)} placeholder="who ran it" className="field" />
        </div>
        <div>
          <label className={label} style={{ color: "var(--muted)" }}>
            Location
          </label>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Brenden's / Online"
            className="field"
          />
        </div>

        <div className="sm:col-span-2">
          <label className={label} style={{ color: "var(--muted)" }}>
            Who was there
          </label>
          <input
            value={players}
            onChange={(e) => setPlayers(e.target.value)}
            placeholder="Madi, Utsav, Sayer, Jessica"
            className="field"
          />
        </div>

        <div className="sm:col-span-2">
          <label className={label} style={{ color: "var(--muted)" }}>
            What happened
          </label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={3}
            placeholder="The crew infiltrated the Syndicate auction and stole the Jewel back..."
            className="field"
            style={{ resize: "vertical" }}
          />
        </div>

        <div>
          <label className={label} style={{ color: "var(--muted)" }}>
            Rating <span className="opacity-60">(optional)</span>
          </label>
          <select value={rating} onChange={(e) => setRating(e.target.value)} className="field">
            <option value="">--</option>
            {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} / 10
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <p className="text-sm mt-4" style={{ color: "var(--bad)" }}>
          {error}
        </p>
      )}
      {saved && !error && (
        <p className="text-sm mt-4" style={{ color: "var(--good)" }}>
          Logged. Add another, or head to the campaign to see it.
        </p>
      )}

      <div className="flex gap-3 mt-6">
        <button
          onClick={submit}
          disabled={pending || (!isEdit && campaigns.length === 0)}
          className="btn text-sm"
        >
          {pending ? "Saving..." : isEdit ? "Save changes" : "Log this session"}
        </button>
        {isEdit && (
          <button onClick={() => onDone?.()} disabled={pending} className="btn-ghost text-sm">
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
