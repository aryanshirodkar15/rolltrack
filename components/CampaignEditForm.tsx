"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Campaign } from "@/lib/stats";

const SYSTEMS = ["D&D 5e", "D&D 2024", "Pathfinder 2e", "One-shot", "Other"];

// Edit a campaign's details in place. Collapsed to a small button until
// opened, so it never competes with the campaign header. Status and delete
// live in CampaignControls; this covers everything else.
export default function CampaignEditForm({ campaign }: { campaign: Campaign }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(campaign.name);
  const [dm, setDm] = useState(campaign.dm);
  const [system, setSystem] = useState(campaign.system);
  const [setting, setSetting] = useState(campaign.setting);
  const [notes, setNotes] = useState(campaign.notes);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  // A saved system might be something not in the preset list.
  const systemOptions = SYSTEMS.includes(system) ? SYSTEMS : [system, ...SYSTEMS];

  async function submit() {
    if (pending) return;
    if (!name.trim()) {
      setError("Name cannot be empty.");
      return;
    }
    setPending(true);
    setError("");
    const res = await fetch(`/api/campaigns/${campaign.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, dm, system, setting, notes }),
    });
    const d = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(d.error ?? "Could not save the changes.");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  const label = "block text-xs uppercase tracking-widest mb-2 mono";

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="chip text-xs px-2.5 py-1">
        Edit details
      </button>
    );
  }

  return (
    <div className="frame panel p-6 w-full">
      <h2 className="display text-xl mb-5">EDIT CAMPAIGN</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className={label} style={{ color: "var(--muted)" }}>
            Name
          </label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="field" />
        </div>
        <div>
          <label className={label} style={{ color: "var(--muted)" }}>
            Dungeon Master
          </label>
          <input value={dm} onChange={(e) => setDm(e.target.value)} placeholder="who usually runs it" className="field" />
        </div>
        <div>
          <label className={label} style={{ color: "var(--muted)" }}>
            System
          </label>
          <select value={system} onChange={(e) => setSystem(e.target.value)} className="field">
            {systemOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={label} style={{ color: "var(--muted)" }}>
            Setting <span className="opacity-60">(optional)</span>
          </label>
          <input
            value={setting}
            onChange={(e) => setSetting(e.target.value)}
            placeholder="Homebrew world, Forgotten Realms, ..."
            className="field"
          />
        </div>
        <div className="sm:col-span-2">
          <label className={label} style={{ color: "var(--muted)" }}>
            Notes <span className="opacity-60">(optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="House rules, the premise, anything worth keeping..."
            className="field"
            style={{ resize: "vertical" }}
          />
        </div>
      </div>

      {error && (
        <p className="text-sm mt-4" style={{ color: "var(--bad)" }}>
          {error}
        </p>
      )}

      <div className="flex gap-3 mt-6">
        <button onClick={submit} disabled={pending} className="btn text-sm">
          {pending ? "Saving..." : "Save changes"}
        </button>
        <button onClick={() => setOpen(false)} disabled={pending} className="btn-ghost text-sm">
          Cancel
        </button>
      </div>
    </div>
  );
}
