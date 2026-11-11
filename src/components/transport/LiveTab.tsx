"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import LeafletMap, { type MapLine, type MapMarker } from "@/components/transport/LeafletMap";
import { card, errorStyle, muted, secondaryButton } from "@/components/ui";
import { api } from "@/lib/api";
import { errorText } from "@/lib/errors";
import {
  ago,
  asList,
  clock,
  DIRECTION_LABEL,
  KIND_LABEL,
  latLng,
  type PathPoint,
  type Rider,
  type Route,
  ROUTE_COLORS,
  todayAD,
  type Trip,
} from "@/lib/transport";

const REFRESH_MS = 5000;

export default function LiveTab() {
  const [live, setLive] = useState<Trip[]>([]);
  const [today, setToday] = useState<Trip[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [path, setPath] = useState<PathPoint[]>([]);
  const [error, setError] = useState("");
  const [, tick] = useState(0); // re-render every few seconds so "12 s ago" stays fresh

  useEffect(() => {
    Promise.all([api<unknown>("/api/v1/routes/?page_size=200"), api<unknown>("/api/v1/child-transport/?page_size=500")])
      .then(([r, c]) => {
        setRoutes(asList<Route>(r));
        setRiders(asList<Rider>(c));
      })
      .catch((err) => setError(errorText(err)));
  }, []);

  const refresh = useCallback(async () => {
    const [l, t] = await Promise.all([
      api<unknown>("/api/v1/trips/live/"),
      api<unknown>(`/api/v1/trips/?date=${todayAD()}&page_size=100`),
    ]);
    setLive(asList<Trip>(l));
    setToday(asList<Trip>(t).filter((x) => x.status === "finished"));
    setError("");
    tick((n) => n + 1);
  }, []);

  useEffect(() => {
    refresh().catch((err) => setError(errorText(err)));
    const timer = setInterval(() => refresh().catch((err) => setError(errorText(err))), REFRESH_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  // The selected trip's driven path (refreshed with the live data)
  useEffect(() => {
    if (!selected) {
      setPath([]);
      return;
    }
    api<PathPoint[]>(`/api/v1/trips/${selected}/path/`)
      .then((p) => setPath(asList<PathPoint>(p)))
      .catch(() => setPath([]));
  }, [selected, live]);

  const colorOf = (routeId: string) => ROUTE_COLORS[Math.max(0, routes.findIndex((r) => r.id === routeId)) % ROUTE_COLORS.length];

  const markers: MapMarker[] = useMemo(() => {
    const list: MapMarker[] = [];
    const shownTrips = [...live, ...today.filter((t) => t.id === selected)];
    for (const trip of shownTrips) {
      const route = routes.find((r) => r.id === trip.route);
      for (const s of [...(route?.stops ?? [])].sort((a, b) => a.order - b.order)) {
        const [lat, lng] = latLng(s);
        list.push({ id: `stop-${s.id}`, lat, lng, html: String(s.order), color: "#9AA0B4", tooltip: s.name });
      }
      if (trip.status === "running" && trip.last_latitude !== null && trip.last_longitude !== null) {
        list.push({
          id: trip.id,
          lat: trip.last_latitude,
          lng: trip.last_longitude,
          html: "🚌",
          big: true,
          color: trip.signal_lost ? "#9CA3AF" : colorOf(trip.route),
          tooltip: `${trip.route_name} · ${trip.bus_name ?? ""} · ${ago(trip.last_seen_at)}`,
        });
      }
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, today, routes, selected]);

  const lines: MapLine[] = useMemo(
    () => (path.length > 1 ? [{ points: path.map((p) => [p.latitude, p.longitude] as [number, number]), color: "#E9A23B" }] : []),
    [path],
  );

  // Re-zoom when the set of running trips or the selection changes, not on every GPS update
  const fitKey = `${live.map((t) => t.id).join(",")}|${selected ?? ""}`;

  function waiting(trip: Trip) {
    const done = new Set(trip.boardings.map((b) => b.child));
    return riders.filter(
      (r) => r.route === trip.route && (trip.direction === "to_school" ? r.morning : r.afternoon) && !done.has(r.child),
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
      <div className="flex flex-col gap-2">
        {error && <p className={errorStyle}>{error}</p>}
        <LeafletMap markers={markers} lines={lines} fitKey={fitKey} height="560px" onMarkerClick={(id) => live.some((t) => t.id === id) && setSelected(id)} />
        <p className={muted}>
          Updates every {REFRESH_MS / 1000} seconds. 🚌 = bus, grey 🚌 = no GPS signal for 3+ minutes, numbers = stops,
          orange line = the path driven by the selected trip.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <p className="font-bold">Buses on the road now ({live.length})</p>
        {live.length === 0 && (
          <div className={card}>
            <p className={muted}>
              No bus is running. A trip starts when the driver/helper taps “Start trip” in the app. To test, run{" "}
              <code className="font-mono text-xs">python manage.py simulate_bus &quot;Route A&quot;</code> in the backend.
            </p>
          </div>
        )}
        {live.map((t) => {
          const wait = waiting(t);
          return (
            <div
              key={t.id}
              onClick={() => setSelected(t.id === selected ? null : t.id)}
              className={`${card} cursor-pointer flex flex-col gap-1 ${t.id === selected ? "ring-2 ring-[#E9A23B]" : ""}`}
            >
              <div className="flex justify-between gap-2">
                <p className="font-bold">
                  <span style={{ color: colorOf(t.route) }}>●</span> {t.route_name}
                </p>
                <span className={muted}>{t.bus_name}</span>
              </div>
              <p className="text-sm">{DIRECTION_LABEL[t.direction]} · started {clock(t.started_at)}</p>
              {t.signal_lost ? (
                <p className="text-sm font-bold text-red-700">⚠️ No GPS signal · last {ago(t.last_seen_at)}</p>
              ) : (
                <p className="text-sm">
                  📍 {ago(t.last_seen_at)}
                  {t.last_speed_kmh !== null ? ` · ${Math.round(t.last_speed_kmh)} km/h` : ""}
                </p>
              )}
              {t.driver_phone && (
                <a className="text-sm font-bold text-[#1F2A5C]" href={`tel:${t.driver_phone}`} onClick={(e) => e.stopPropagation()}>
                  📞 {t.driver_name || "Driver"} {t.driver_phone}
                </a>
              )}
              <div className="mt-1 text-sm">
                {t.boardings.map((b) => (
                  <p key={b.id}>
                    {KIND_LABEL[b.kind]} {b.child_name} <span className={muted}>{clock(b.at)}{b.stop_name ? ` · ${b.stop_name}` : ""}</span>
                  </p>
                ))}
                {wait.length > 0 && (
                  <p className={muted}>⏳ Not yet ticked: {wait.map((r) => r.child_name).join(", ")}</p>
                )}
              </div>
            </div>
          );
        })}

        <p className="font-bold mt-2">Finished today ({today.length})</p>
        {today.length === 0 && <p className={muted}>None yet.</p>}
        {today.map((t) => (
          <div key={t.id} className={`${card} flex justify-between items-center gap-2 ${t.id === selected ? "ring-2 ring-[#E9A23B]" : ""}`}>
            <div className="text-sm">
              <p className="font-bold">{t.route_name}</p>
              <p className={muted}>
                {t.direction === "to_school" ? "Morning" : "Afternoon"} · {clock(t.started_at)}–{clock(t.ended_at)} ·{" "}
                {t.boardings.filter((b) => b.kind !== "absent").length} children
              </p>
            </div>
            <button className={secondaryButton} onClick={() => setSelected(t.id === selected ? null : t.id)}>
              {t.id === selected ? "Hide" : "Path"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
