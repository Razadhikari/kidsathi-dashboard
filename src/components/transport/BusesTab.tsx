"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import Modal from "@/components/Modal";
import { card, dangerButton, errorStyle, input, label, muted, primaryButton, secondaryButton } from "@/components/ui";
import { api } from "@/lib/api";
import { errorText } from "@/lib/errors";
import { asList, type Bus } from "@/lib/transport";

const EMPTY: Omit<Bus, "id"> = {
  name: "",
  plate_number: "",
  capacity: null,
  driver_name: "",
  driver_phone: "",
  helper_name: "",
  helper_phone: "",
  tracker_id: "",
  is_active: true,
};

export default function BusesTab() {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [editing, setEditing] = useState<Bus | "new" | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setBuses(asList<Bus>(await api<unknown>("/api/v1/buses/?page_size=200")));
  }, []);

  useEffect(() => {
    load().catch((err) => setError(errorText(err)));
  }, [load]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between gap-2">
        <p className={muted}>Each bus or van with its driver and helper (bus didi / khalasi).</p>
        <button className={primaryButton} onClick={() => setEditing("new")}>
          + Add bus
        </button>
      </div>
      {error && <p className={errorStyle}>{error}</p>}
      {buses.length === 0 && (
        <div className={`${card} text-center`}>
          <p className="text-lg font-bold">No buses yet</p>
          <p className={muted}>Add your first bus, then create routes for it.</p>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {buses.map((b) => (
          <div key={b.id} className={`${card} flex flex-col gap-1 ${b.is_active ? "" : "opacity-60"}`}>
            <div className="flex justify-between gap-2">
              <p className="text-lg font-bold">🚌 {b.name}</p>
              <button className={secondaryButton} onClick={() => setEditing(b)}>
                Edit
              </button>
            </div>
            {b.plate_number && <p className="font-mono">{b.plate_number}</p>}
            <p>
              Driver: {b.driver_name || "–"}{" "}
              {b.driver_phone && (
                <a className="font-bold text-[#1F2A5C]" href={`tel:${b.driver_phone}`}>
                  📞 {b.driver_phone}
                </a>
              )}
            </p>
            <p>
              Helper: {b.helper_name || "–"}{" "}
              {b.helper_phone && (
                <a className="font-bold text-[#1F2A5C]" href={`tel:${b.helper_phone}`}>
                  📞 {b.helper_phone}
                </a>
              )}
            </p>
            <p className={muted}>
              {b.capacity ? `${b.capacity} seats` : ""}
              {b.tracker_id ? ` · GPS tracker ${b.tracker_id}` : ""}
              {!b.is_active ? " · not in use" : ""}
            </p>
          </div>
        ))}
      </div>

      {editing && (
        <BusForm
          bus={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

function BusForm({ bus, onClose, onSaved }: { bus: Bus | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState<Omit<Bus, "id">>(bus ?? EMPTY);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (bus) await api(`/api/v1/buses/${bus.id}/`, { method: "PATCH", json: form });
      else await api("/api/v1/buses/", { method: "POST", json: form });
      await onSaved();
    } catch (err) {
      setError(errorText(err));
      setSaving(false);
    }
  }

  async function remove() {
    if (!bus || !window.confirm(`Delete ${bus.name}? Its routes will have no bus.`)) return;
    try {
      await api(`/api/v1/buses/${bus.id}/`, { method: "DELETE" });
      await onSaved();
    } catch (err) {
      setError(errorText(err));
    }
  }

  const text = (k: "name" | "plate_number" | "driver_name" | "driver_phone" | "helper_name" | "helper_phone" | "tracker_id", title: string, placeholder = "", required = false) => (
    <label className={label}>
      {title}
      <input className={input} required={required} placeholder={placeholder} value={form[k]} onChange={(e) => set(k, e.target.value)} />
    </label>
  );

  return (
    <Modal title={bus ? `Edit ${bus.name}` : "Add bus"} onClose={onClose}>
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
        {text("name", "Bus name", "Bus 1", true)}
        {text("plate_number", "Number plate", "Ba 2 Kha 1234")}
        {text("driver_name", "Driver name")}
        {text("driver_phone", "Driver phone", "98XXXXXXXX")}
        {text("helper_name", "Helper (didi / khalasi)")}
        {text("helper_phone", "Helper phone", "98XXXXXXXX")}
        <label className={label}>
          Seats
          <input
            className={input}
            type="number"
            min={1}
            value={form.capacity ?? ""}
            onChange={(e) => set("capacity", e.target.value ? Number(e.target.value) : null)}
          />
        </label>
        {text("tracker_id", "GPS tracker IMEI (optional)", "only if the bus has a fixed tracker")}
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} />
          In use
        </label>
        {error && <p className={`${errorStyle} md:col-span-2`}>{error}</p>}
        <div className="md:col-span-2 flex justify-between gap-2">
          {bus ? (
            <button type="button" className={dangerButton} onClick={remove}>
              Delete bus
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" className={secondaryButton} onClick={onClose}>
              Cancel
            </button>
            <button className={primaryButton} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
