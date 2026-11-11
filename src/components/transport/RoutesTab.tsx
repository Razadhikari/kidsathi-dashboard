"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Modal from "@/components/Modal";
import NepaliInput from "@/components/NepaliInput";
import LeafletMap, { type MapMarker } from "@/components/transport/LeafletMap";
import { card, dangerButton, errorStyle, input, label, muted, primaryButton, secondaryButton } from "@/components/ui";
import { api } from "@/lib/api";
import { errorText } from "@/lib/errors";
import { asList, type Bus, hhmm, latLng, type Route, type Stop } from "@/lib/transport";

type StopDraft = Partial<Stop> & { latitude: string; longitude: string };

export default function RoutesTab() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [routeForm, setRouteForm] = useState<Route | "new" | null>(null);
  const [stopForm, setStopForm] = useState<StopDraft | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [r, b] = await Promise.all([
      api<unknown>("/api/v1/routes/?page_size=200"),
      api<unknown>("/api/v1/buses/?page_size=200"),
    ]);
    const list = asList<Route>(r);
    setRoutes(list);
    setBuses(asList<Bus>(b));
    setSelectedId((cur) => cur ?? list[0]?.id ?? null);
  }, []);

  useEffect(() => {
    load().catch((err) => setError(errorText(err)));
  }, [load]);

  const route = routes.find((r) => r.id === selectedId) ?? null;
  const stops = useMemo(() => [...(route?.stops ?? [])].sort((a, b) => a.order - b.order), [route]);

  const markers: MapMarker[] = useMemo(
    () =>
      stops.map((s, i) => {
        const [lat, lng] = latLng(s);
        const last = i === stops.length - 1;
        return {
          id: s.id,
          lat,
          lng,
          html: last ? "🏫" : String(i + 1),
          color: last ? "#E9A23B" : "#1F2A5C",
          tooltip: `${s.order}. ${s.name}${s.morning_time ? ` · ${hhmm(s.morning_time)}` : ""}`,
          draggable: true,
        };
      }),
    [stops],
  );
  const lines = useMemo(() => [{ points: stops.map(latLng), color: "#1F2A5C", dashed: true }], [stops]);

  async function moveStop(id: string, lat: number, lng: number) {
    try {
      await api(`/api/v1/stops/${id}/`, { method: "PATCH", json: { latitude: lat.toFixed(6), longitude: lng.toFixed(6) } });
      await load();
    } catch (err) {
      setError(errorText(err));
    }
  }

  /** Swap a stop with its neighbour (↑ / ↓ buttons) */
  async function reorder(index: number, delta: -1 | 1) {
    const a = stops[index];
    const b = stops[index + delta];
    if (!a || !b) return;
    try {
      // renumber all stops 1..n with the two swapped, so equal numbers never cause confusion
      const order = stops.map((s) => s.id);
      [order[index], order[index + delta]] = [order[index + delta], order[index]];
      await Promise.all(order.map((id, i) => api(`/api/v1/stops/${id}/`, { method: "PATCH", json: { order: i + 1 } })));
      await load();
    } catch (err) {
      setError(errorText(err));
    }
  }

  async function removeStop(s: Stop) {
    if (!window.confirm(`Delete the stop “${s.name}”? Children using it will have no stop set.`)) return;
    try {
      await api(`/api/v1/stops/${s.id}/`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
      <div className={`${card} flex flex-col gap-2`}>
        <button className={primaryButton} onClick={() => setRouteForm("new")}>
          + New route
        </button>
        {routes.length === 0 && <p className={muted}>No routes yet. Add a bus first (Buses tab), then a route.</p>}
        {routes.map((r) => (
          <button
            key={r.id}
            onClick={() => setSelectedId(r.id)}
            className={`text-left rounded-lg px-3 py-2 ${r.id === selectedId ? "bg-[#1F2A5C] text-white" : "hover:bg-[#FBF7F0]"}`}
          >
            <p className="font-bold">{r.name}</p>
            <p className="text-sm opacity-80">
              {r.bus_name ?? "no bus"} · {r.stops.length} stops · {r.rider_count} children
            </p>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        {error && <p className={errorStyle}>{error}</p>}
        {route ? (
          <>
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-2xl font-extrabold">{route.name}</h2>
                <p className={muted}>
                  🚌 {route.bus_name ?? "No bus chosen"}
                  {route.notes ? ` · ${route.notes}` : ""}
                  {!route.is_active ? " · not in use" : ""}
                </p>
              </div>
              <button className={secondaryButton} onClick={() => setRouteForm(route)}>
                Edit route
              </button>
            </div>

            <p className="rounded-lg bg-[#FBF7F0] border border-[#E7E1D6] px-3 py-2 text-sm">
              👆 <b>Click on the map</b> to add a stop there. <b>Drag a pin</b> to move a stop. Put stops in the
              <b> morning order</b> (first pick-up = 1) and make the <b>school the last stop</b> 🏫.
            </p>
            <LeafletMap
              markers={markers}
              lines={lines}
              fitKey={route.id}
              onMapClick={(lat, lng) =>
                setStopForm({
                  route: route.id,
                  latitude: lat.toFixed(6),
                  longitude: lng.toFixed(6),
                  order: (stops.at(-1)?.order ?? 0) + 1,
                })
              }
              onMarkerDrag={moveStop}
              onMarkerClick={(id) => {
                const s = stops.find((x) => x.id === id);
                if (s) setStopForm(s);
              }}
            />

            <div className={card}>
              <p className="font-bold mb-2">Stops ({stops.length})</p>
              {stops.length === 0 && <p className={muted}>No stops yet — click on the map.</p>}
              <table className="w-full text-sm">
                {stops.length > 0 && (
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="py-1">#</th>
                      <th>Stop</th>
                      <th>Morning pick-up</th>
                      <th>Afternoon drop</th>
                      <th />
                    </tr>
                  </thead>
                )}
                <tbody>
                  {stops.map((s, i) => (
                    <tr key={s.id} className="border-t border-[#F3EEE5]">
                      <td className="py-2 font-bold">{s.order}</td>
                      <td>
                        {s.name} {s.name_ne && <span className={muted}>({s.name_ne})</span>}
                      </td>
                      <td>{hhmm(s.morning_time) || "–"}</td>
                      <td>{hhmm(s.afternoon_time) || "–"}</td>
                      <td className="text-right whitespace-nowrap">
                        <button className="px-2 disabled:opacity-30" disabled={i === 0} onClick={() => reorder(i, -1)} title="Move up">
                          ↑
                        </button>
                        <button
                          className="px-2 disabled:opacity-30"
                          disabled={i === stops.length - 1}
                          onClick={() => reorder(i, 1)}
                          title="Move down"
                        >
                          ↓
                        </button>
                        <button className="px-2 font-bold text-[#1F2A5C]" onClick={() => setStopForm(s)}>
                          Edit
                        </button>
                        <button className="px-2 text-red-700" onClick={() => removeStop(s)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className={`${card} text-center`}>
            <p className={muted}>Choose or create a route.</p>
          </div>
        )}
      </div>

      {routeForm && (
        <RouteForm
          route={routeForm === "new" ? null : routeForm}
          buses={buses}
          onClose={() => setRouteForm(null)}
          onSaved={async (id) => {
            setRouteForm(null);
            if (id !== undefined) setSelectedId(id);
            await load();
          }}
        />
      )}
      {stopForm && (
        <StopForm
          stop={stopForm}
          onClose={() => setStopForm(null)}
          onSaved={async () => {
            setStopForm(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

function RouteForm(props: {
  route: Route | null;
  buses: Bus[];
  onClose: () => void;
  onSaved: (selectId?: string | null) => Promise<void>;
}) {
  const { route, buses, onClose, onSaved } = props;
  const [form, setForm] = useState({
    name: route?.name ?? "",
    bus: route?.bus ?? "",
    notes: route?.notes ?? "",
    is_active: route?.is_active ?? true,
  });
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const json = { ...form, bus: form.bus || null };
      if (route) {
        await api(`/api/v1/routes/${route.id}/`, { method: "PATCH", json });
        await onSaved();
      } else {
        const created = await api<Route>("/api/v1/routes/", { method: "POST", json });
        await onSaved(created.id);
      }
    } catch (err) {
      setError(errorText(err));
    }
  }

  async function remove() {
    if (!route) return;
    if (!window.confirm(`Delete “${route.name}” with all its stops, children's bus settings and trip history?`)) return;
    try {
      await api(`/api/v1/routes/${route.id}/`, { method: "DELETE" });
      await onSaved(null);
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <Modal title={route ? "Edit route" : "New route"} onClose={onClose}>
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
        <label className={label}>
          Route name
          <input
            className={input}
            required
            placeholder="Route A – Satdobato"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <label className={label}>
          Bus
          <select className={input} value={form.bus} onChange={(e) => setForm({ ...form, bus: e.target.value })}>
            <option value="">No bus yet</option>
            {buses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} {b.plate_number && `(${b.plate_number})`}
              </option>
            ))}
          </select>
        </label>
        <label className={`${label} md:col-span-2`}>
          Notes (optional)
          <input className={input} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
          In use
        </label>
        {error && <p className={`${errorStyle} md:col-span-2`}>{error}</p>}
        <div className="md:col-span-2 flex justify-between gap-2">
          {route ? (
            <button type="button" className={dangerButton} onClick={remove}>
              Delete route
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" className={secondaryButton} onClick={onClose}>
              Cancel
            </button>
            <button className={primaryButton}>{route ? "Save" : "Create route"}</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function StopForm({ stop, onClose, onSaved }: { stop: StopDraft; onClose: () => void; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState({
    name: stop.name ?? "",
    name_ne: stop.name_ne ?? "",
    latitude: stop.latitude,
    longitude: stop.longitude,
    order: stop.order ?? 1,
    morning_time: hhmm(stop.morning_time ?? null),
    afternoon_time: hhmm(stop.afternoon_time ?? null),
  });
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const json = {
      ...form,
      route: stop.route,
      morning_time: form.morning_time || null,
      afternoon_time: form.afternoon_time || null,
    };
    try {
      if (stop.id) await api(`/api/v1/stops/${stop.id}/`, { method: "PATCH", json });
      else await api("/api/v1/stops/", { method: "POST", json });
      await onSaved();
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <Modal title={stop.id ? `Edit stop “${stop.name}”` : "New stop"} onClose={onClose}>
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
        <label className={label}>
          Stop name
          <input
            className={input}
            required
            autoFocus
            placeholder="Satdobato chowk"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <label className={label}>
          Name in Nepali (optional)
          <NepaliInput
            value={form.name_ne}
            onChange={(v) => setForm({ ...form, name_ne: v })}
            placeholder="सातदोबाटो चोक"
            fromEnglish={form.name}
          />
        </label>
        <label className={label}>
          Morning pick-up time
          <input type="time" className={input} value={form.morning_time} onChange={(e) => setForm({ ...form, morning_time: e.target.value })} />
        </label>
        <label className={label}>
          Afternoon drop time
          <input
            type="time"
            className={input}
            value={form.afternoon_time}
            onChange={(e) => setForm({ ...form, afternoon_time: e.target.value })}
          />
        </label>
        <label className={label}>
          Order on the morning route
          <input
            type="number"
            min={0}
            className={input}
            value={form.order}
            onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
          />
        </label>
        <div className={`${label} text-sm`}>
          Position
          <p className="font-mono text-gray-600">
            {Number(form.latitude).toFixed(5)}, {Number(form.longitude).toFixed(5)}
          </p>
          <p className={muted}>Drag the pin on the map to change it.</p>
        </div>
        {error && <p className={`${errorStyle} md:col-span-2`}>{error}</p>}
        <div className="md:col-span-2 flex justify-end gap-2">
          <button type="button" className={secondaryButton} onClick={onClose}>
            Cancel
          </button>
          <button className={primaryButton}>{stop.id ? "Save" : "Add stop"}</button>
        </div>
      </form>
    </Modal>
  );
}
