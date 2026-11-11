import type { Child } from "@/lib/types";

export type Notice = {
  id: string;
  title: string;
  body: string;
  classroom: string | null;
  is_pinned: boolean;
  author_name: string | null;
  created_at: string;
};

export type Thread = {
  id: string;
  subject: string;
  child: string | null;
  child_name: string | null;
  participants: string[];
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
};

export type Message = {
  id: string;
  body: string;
  sender_name: string | null;
  is_mine: boolean;
  created_at: string;
};

/** Accepts a plain list or a paginated { results: [...] } reply. */
export function asList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    for (const key of ["results", "readers", "reads", "users", "items"]) {
      if (Array.isArray(obj[key])) return obj[key] as T[];
    }
  }
  return [];
}

export type Reader = { userId: string; name: string; readAt: string };

/** Turns whatever /notices/{id}/reads/ returns into a simple list of readers. */
export function parseReaders(data: unknown): Reader[] {
  return asList<Record<string, unknown>>(data).map((r) => {
    const user = r.user && typeof r.user === "object" ? (r.user as Record<string, unknown>) : null;
    const pick = (...vals: unknown[]) => String(vals.find((v) => typeof v === "string" && v) ?? "");
    return {
      userId: pick(r.user_id, typeof r.user === "string" ? r.user : undefined, user?.id),
      name: pick(r.user_name, r.full_name, r.name, user?.full_name, r.phone_number, user?.phone_number) || "Parent",
      readAt: pick(r.read_at, r.created_at),
    };
  });
}

export type Audience = { userId: string; name: string; phone: string; children: string[] };

/** Parents who should get a notice: guardians of active children (of one class, or all). */
export function audienceOf(children: Child[], classroom: string | null): Audience[] {
  const map = new Map<string, Audience>();
  for (const c of children) {
    if (classroom && c.classroom !== classroom) continue;
    for (const g of c.guardians ?? []) {
      const key = g.user_id || g.id;
      const entry = map.get(key) ?? { userId: key, name: g.full_name || g.phone_number, phone: g.phone_number, children: [] };
      entry.children.push(c.first_name);
      map.set(key, entry);
    }
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function when(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export const NOTICE_IDEAS = [
  { title: "School closed", body: "The school will remain closed on … for … Classes resume on …" },
  { title: "Fee reminder", body: "Dear parents, please pay this month’s fee by … Thank you." },
  { title: "Parent–teacher meeting", body: "A parent–teacher meeting will be held on … at … Please attend." },
  { title: "Event", body: "We are celebrating … on … Children may come in … dress." },
];
