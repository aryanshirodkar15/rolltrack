"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { durationMinutes, formatDuration } from "@/lib/sessions";

type CampaignOption = { id: string; name: string; dm: string };

// Today as yyyy-mm-dd in the viewer's own timezone, for the date default.
function todayISO(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

// The log-a-session form. Reused on the campaign page (with the campaign
// fixed) and on the standalone /log page (with a picker). On success it
// refreshes server data so the new night shows up immediately.
export default function SessionForm({
  campaigns,
  fixedCampaignId,
  defaults,
}: {
  campaigns: CampaignOption[];
  fixedCampaignId?: string;
  defaults?: { dm?: string; level?: number | null; arc?: string; players?: string };
}) {
  const router = useRouter();
  const [campaignId, setCampaignId] = useState(
    fixedCampaignId ?? campaigns[0]?.id ?? ""
  );
  const [date, setDate] = useState(todayISO());
  const [sessionNumber, setSessionNumber] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [level, setLevel] = useState(defaults?.level != null ? String(defaults.level) : "");
  const [gameDays, setGameDays] = useState("");
  const [arc, setArc] = useState(defaults?.arc ?? "");
  const [dm, setDm] = useState(defaults?.dm ?? "");
  const [location, setLocation] = useState("");
  const [players, setPlayers] = useState(defaults?.players ?? "");
  const [summary, setSummary] = useState("");
  const [rating, setRating] = useState("");
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
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignId,
        date,
        sessionNumber: sessionNumber || undefined,
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
      }),
    });
    const d = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(d.error ?? "Could not log the session.");
      return;
    }
    // Keep the sticky context (campaign, DM, arc, players, level) so logging
    // several nights in a row stays quick; clear the per-night fields.
    setSessionNumber("");
    setStartTime("");
    setEndTime("");
    setGameDays("");
    setSummary("");
    setRating("");
    setSaved(true);
    router.refresh();
  }

  const label = "block text-xs uppercase tracking-widest mb-2 mono";

  return (
    <div className="frame panel p-6">
      <div className="grid sm:grid-cols-2 gap-4">
        {!fixedCampaignId && (
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

      <button
        onClick={submit}
        disabled={pending || campaigns.length === 0}
        className="btn text-sm mt-6"
      >
        {pending ? "Logging..." : "Log this session"}
      </button>
    </div>
  );
}
