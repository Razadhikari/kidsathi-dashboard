"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import Modal from "@/components/Modal";
import { card, errorStyle, input, label, muted, primaryButton, secondaryButton } from "@/components/ui";
import { api, type Paged } from "@/lib/api";
import { errorText } from "@/lib/errors";
import { asList, hhmm, type Rider, type Route } from "@/lib/transport";
import { type Child, type Classroom, fullName } from "@/lib/types";

export default function RidersTab() {
  const [riders, setRiders] = useState<Rider[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [kids, setKids] = useState<Child[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [routeFilter, setRouteFilter] = useState("");
  const [editing, setEditing] = useState<Rider | "new" | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [r, rt, k, c] = await Promise.all([
      api<unknown>("/api/v1/child-transport/?page_size=500"),
      api<unknown>("/api/v1/routes/?page_size=200"),
      api<Paged<Child>>("/api/v1/children/?page_size=500"),
      api<Paged<Classroom>>("/api/v1/classrooms/?page_size=500"),
    ]);
    setRiders(asList<Rider>(r));
    setRoutes(asList<Route>(rt));
    setKids(k.results);
    setClassrooms(c.results);
  }, []);

  useEffect(() => {
    load().catch((err) => setError(errorText(err)));
  }, [load]);

  const routeName = (id: string) => routes.find((r) => r.id === id)?.name ?? "–";
  const roomName = (id: string | null) => classrooms.find((r) => r.id === id)?.name ?? "";
  const shown = riders.filter((r) => !routeFilter || r.route === routeFilter);
  const walkers = kids.filter((k) => !riders.some((r) => r.child === k.id)).length;

  async function remove(r: Rider) {
    if (!window.confirm(`${r.child_name} no longer uses the bus?`)) return;
    try {
      await api(`/api/v1/child-transport/${r.id}/`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap justify-between gap-2">
        <div className="flex items-center gap-3">
          <select className={`${input} w-60`} value={routeFilter} onChange={(e) => setRouteFilter(e.target.value)}>
            <option value="">All routes</option>
            {routes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.rider_count})
              </option>
            ))}
          </select>
          <p className={muted}>
            {riders.length} children use the bus · {walkers} don’t
          </p>
        </div>
        <button className={primaryButton} onClick={() => setEditing("new")} disabled={routes.length === 0}>
          + Add child to a bus
        </button>
      </div>
      {error && <p className={errorStyle}>{error}</p>}
      {routes.length === 0 && <p className={muted}>Create a route with stops first (Routes & stops tab).</p>}
      <p className={muted}>Tip: also give these children the “Transport” fee in Fees → Child fees.</p>

      <div className={card}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-1">Child</th>
              <th>Class</th>
              <th>Route</th>
              <th>Morning pick-up</th>
              <th>Afternoon drop</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} className="border-t border-[#F3EEE5]">
                <td className="py-2 font-bold">{r.child_name}</td>
                <td>{roomName(r.classroom)}</td>
                <td>{routeName(r.route)}</td>
                <td>{r.morning ? (r.pickup_stop_name ?? "stop not set") : <span className={muted}>no</span>}</td>
                <td>{r.afternoon ? (r.drop_stop_name ?? "stop not set") : <span className={muted}>no</span>}</td>
                <td className="text-right whitespace-nowrap">
                  <button className="px-2 font-bold text-[#1F2A5C]" onClick={() => setEditing(r)}>
                    Edit
                  </button>
                  <button className="px-2 text-red-700" onClick={() => remove(r)}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={6} className={`py-4 text-center ${muted}`}>
                  No children on the bus yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <RiderForm
          rider={editing === "new" ? null : editing}
          routes={routes}
          kids={kids.filter((k) => editing !== "new" || !riders.some((r) => r.child === k.id))}
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

function RiderForm(props: {
  rider: Rider | null;
  routes: Route[];
  kids: Child[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { rider, routes, kids, onClose, onSaved } = props;
  const [form, setForm] = useState({
    child: rider?.child ?? "",
    route: rider?.route ?? routes[0]?.id ?? "",
    pickup_stop: rider?.pickup_stop ?? "",
    drop_stop: rider?.drop_stop ?? "",
    morning: rider?.morning ?? true,
    afternoon: rider?.afternoon ?? true,
  });
  const [error, setError] = useState("");
  const stops = [...(routes.find((r) => r.id === form.route)?.stops ?? [])].sort((a, b) => a.order - b.order);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const json = { ...form, pickup_stop: form.pickup_stop || null, drop_stop: form.drop_stop || null };
    try {
      if (rider) await api(`/api/v1/child-transport/${rider.id}/`, { method: "PATCH", json });
      else await api("/api/v1/child-transport/", { method: "POST", json });
      await onSaved();
    } catch (err) {
      setError(errorText(err));
    }
  }

  const stopSelect = (key: "pickup_stop" | "drop_stop", title: string, time: "morning_time" | "afternoon_time") => (
    <label className={label}>
      {title}
      <select className={input} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}>
        <option value="">Choose a stop</option>
        {stops.map((s) => (
          <option key={s.id} value={s.id}>
            {s.order}. {s.name} {s[time] ? `· ${hhmm(s[time])}` : ""}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <Modal title={rider ? `Bus for ${rider.child_name}` : "Add child to a bus"} onClose={onClose}>
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
        <label className={label}>
          Child
          <select
            className={input}
            required
            disabled={Boolean(rider)}
            value={form.child}
            onChange={(e) => setForm({ ...form, child: e.target.value })}
          >
            <option value="">Choose a child</option>
            {kids.map((k) => (
              <option key={k.id} value={k.id}>
                {fullName(k)}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          Route
          <select
            className={input}
            required
            value={form.route}
            onChange={(e) => {
              // a new route has other stops, so the old stop choices can't stay
              setForm({ ...form, route: e.target.value, pickup_stop: "", drop_stop: "" });
            }}
          >
            {routes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={form.morning} onChange={(e) => setForm({ ...form, morning: e.target.checked })} />
          🌅 Takes the bus to school
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={form.afternoon} onChange={(e) => setForm({ ...form, afternoon: e.target.checked })} />
          🌇 Takes the bus home
        </label>
        {form.morning ? stopSelect("pickup_stop", "Morning pick-up stop", "morning_time") : <span />}
        {form.afternoon ? stopSelect("drop_stop", "Afternoon drop stop", "afternoon_time") : <span />}
        {stops.length === 0 && <p className={`${muted} md:col-span-2`}>This route has no stops yet.</p>}
        {error && <p className={`${errorStyle} md:col-span-2`}>{error}</p>}
        <div className="md:col-span-2 flex justify-end gap-2">
          <button type="button" className={secondaryButton} onClick={onClose}>
            Cancel
          </button>
          <button className={primaryButton}>Save</button>
        </div>
      </form>
    </Modal>
  );
}
