"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const SYSTEMS = ["D&D 5e", "D&D 2024", "Pathfinder 2e", "One-shot", "Other"];

// A collapsible "start a new campaign" form. Opens on demand so the campaigns
// page stays a clean shelf until you want to add to it.
export default function CampaignForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [dm, setDm] = useState("");
  const [system, setSystem] = useState("D&D 5e");
  const [setting, setSetting] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit() {
    if (pending) return;
    if (!name.trim()) {
      setError("Give the campaign a name.");
      return;
    }
    setPending(true);
    setError("");
    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, dm, system, setting }),
    });
    const d = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(d.error ?? "Could not create the campaign.");
      return;
    }
    setName("");
    setDm("");
    setSetting("");
    setSystem("D&D 5e");
    setOpen(false);
    if (d.campaign?.id) router.push(`/campaigns/${d.campaign.id}`);
    else router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn text-sm">
        + New campaign
      </button>
    );
  }

  return (
    <div className="frame panel p-6">
      <h2 className="display text-2xl mb-5">START A CAMPAIGN</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs uppercase tracking-widest mb-2 mono" style={{ color: "var(--muted)" }}>
            Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Honeycomb Academy"
            autoFocus
            className="field"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest mb-2 mono" style={{ color: "var(--muted)" }}>
            Dungeon Master
          </label>
          <input
            value={dm}
            onChange={(e) => setDm(e.target.value)}
            placeholder="Who usually runs it"
            className="field"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest mb-2 mono" style={{ color: "var(--muted)" }}>
            System
          </label>
          <select value={system} onChange={(e) => setSystem(e.target.value)} className="field">
            {SYSTEMS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs uppercase tracking-widest mb-2 mono" style={{ color: "var(--muted)" }}>
            Setting <span className="opacity-60">(optional)</span>
          </label>
          <input
            value={setting}
            onChange={(e) => setSetting(e.target.value)}
            placeholder="Homebrew world, Forgotten Realms, ..."
            className="field"
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
          {pending ? "Creating..." : "Create campaign"}
        </button>
        <button onClick={() => setOpen(false)} className="btn-ghost text-sm">
          Cancel
        </button>
      </div>
    </div>
  );
}
