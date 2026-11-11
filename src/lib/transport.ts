export type Bus = {
  id: string;
  name: string;
  plate_number: string;
  capacity: number | null;
  driver_name: string;
  driver_phone: string;
  helper_name: string;
  helper_phone: string;
  tracker_id: string;
  is_active: boolean;
};

export type Stop = {
  id: string;
  route: string;
  name: string;
  name_ne: string;
  latitude: string; // decimal from the API
  longitude: string;
  order: number;
  morning_time: string | null; // "07:15:00"
  afternoon_time: string | null;
};

export type Route = {
  id: string;
  name: string;
  bus: string | null;
  bus_name: string | null;
  notes: string;
  is_active: boolean;
  stops: Stop[];
  rider_count: number;
};

export type Rider = {
  id: string;
  child: string;
  child_name: string;
  classroom: string | null;
  route: string;
  pickup_stop: string | null;
  pickup_stop_name: string | null;
  drop_stop: string | null;
  drop_stop_name: string | null;
  morning: boolean;
  afternoon: boolean;
};

export type Boarding = {
  id: string;
  child: string;
  child_name: string;
  kind: "boarded" | "dropped" | "absent";
  stop: string | null;
  stop_name: string | null;
  at: string;
};

export type Trip = {
  id: string;
  route: string;
  route_name: string;
  bus: string | null;
  bus_name: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  direction: "to_school" | "to_home";
  status: "running" | "finished";
  started_at: string;
  ended_at: string | null;
  started_by_name: string | null;
  last_latitude: number | null;
  last_longitude: number | null;
  last_speed_kmh: number | null;
  last_seen_at: string | null;
  signal_lost: boolean;
  boardings: Boarding[];
};

export type PathPoint = { latitude: number; longitude: number; speed_kmh: number | null; recorded_at: string };

/** Kathmandu, for an empty map */
export const KATHMANDU: [number, number] = [27.7172, 85.324];

export const DIRECTION_LABEL: Record<Trip["direction"], string> = {
  to_school: "🌅 Morning · home → school",
  to_home: "🌇 Afternoon · school → home",
};

export const KIND_LABEL: Record<Boarding["kind"], string> = {
  boarded: "🟢 Boarded",
  dropped: "🏁 Dropped",
  absent: "⚪ Not at stop",
};

/** A different colour for each route on the map */
export const ROUTE_COLORS = ["#1F2A5C", "#E9A23B", "#2E8B57", "#C0392B", "#7B4BB7", "#1A8FB5", "#A0522D"];

export const latLng = (s: Pick<Stop, "latitude" | "longitude">): [number, number] => [
  parseFloat(s.latitude),
  parseFloat(s.longitude),
];

export const hhmm = (t: string | null) => (t ? t.slice(0, 5) : "");

export function ago(iso: string | null): string {
  if (!iso) return "no GPS yet";
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s} s ago`;
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export const clock = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "";

export function todayAD(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Accepts a plain list or a paginated { results: [...] } reply. */
export function asList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  const results = (data as { results?: unknown } | null)?.results;
  return Array.isArray(results) ? (results as T[]) : [];
}
