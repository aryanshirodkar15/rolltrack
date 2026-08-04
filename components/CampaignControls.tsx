"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUSES = [
  { value: "planned", label: "Planned" },
  { value: "active", label: "Active" },
  { value: "finished", label: "Finished" },
  { value: "abandoned", label: "Abandoned" },
];

// Status switcher and a guarded delete for a single campaign. Deleting takes
// its sessions with it, so it asks first.
export default function CampaignControls({
  id,
  status,
  name,
}: {
  id: string;
  status: string;
  name: string;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(status);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function changeStatus(next: string) {
    setCurrent(next);
    setSaving(true);
    await fetch(`/api/campaigns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setSaving(false);
    router.refresh();
  }

  async function remove() {
    setDeleting(true);
    const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/campaigns");
      router.refresh();
    } else {
      setDeleting(false);
      setConfirming(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="mono text-[10px] uppercase tracking-widest" style={{ color: "var(--muted)" }}>
        Status
      </label>
      <select
        value={current}
        onChange={(e) => changeStatus(e.target.value)}
        disabled={saving}
        className="field w-auto py-1.5"
      >
        {STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      {confirming ? (
        <span className="flex items-center gap-2">
          <span className="text-xs" style={{ color: "var(--bad)" }}>
            Delete {name} and its sessions?
          </span>
          <button onClick={remove} disabled={deleting} className="chip text-xs px-2.5 py-1" style={{ color: "var(--bad)" }}>
            {deleting ? "Deleting..." : "Delete"}
          </button>
          <button onClick={() => setConfirming(false)} className="chip text-xs px-2.5 py-1">
            Keep
          </button>
        </span>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          className="chip text-xs px-2.5 py-1 ml-auto"
          title="Delete campaign"
        >
          Delete campaign
        </button>
      )}
    </div>
  );
}
