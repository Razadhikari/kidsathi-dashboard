"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Modal from "@/components/Modal";
import { card, errorStyle, input, label, muted, primaryButton, secondaryButton, textarea } from "@/components/ui";
import { api, type Paged } from "@/lib/api";
import { errorText } from "@/lib/errors";
import { type Child, type Classroom, fullName, type Option } from "@/lib/types";

type AttendanceRow = {
  id: string;
  child: string;
  child_name: string;
  date: string;
  check_in_at: string | null;
  check_out_at: string | null;
};

type Absence = {
  id: string;
  child: string;
  child_name: string;
  kind: string;
  start_date: string;
  end_date: string;
  note: string;
  reported_by_name: string | null;
};

type Status = "waiting" | "here" | "left" | "absent";

const KINDS: Option[] = [
  { value: "sick", label: "Sick · बिरामी" },
  { value: "leave", label: "Leave · बिदा" },
  { value: "holiday", label: "Holiday · छुट्टी" },
  { value: "other", label: "Other · अन्य" },
];

const kindLabel = (kind: string) => KINDS.find((k) => k.value === kind)?.label ?? kind;

/** Today's date in Nepal as YYYY-MM-DD (the school's day, not the laptop's). */
const nepalToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kathmandu" });

const time = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kathmandu" }) : "";

const BADGE: Record<Status, string> = {
  waiting: "bg-[#F0EFEC] text-[#5B6170]",
  here: "bg-[#E5F4E4] text-[#17432F]",
  left: "bg-[#E7F1FB] text-[#1B3F66]",
  absent: "bg-[#F9ECE7] text-[#8A3B12]",
};

const smallButton = "h-9 px-3 rounded-lg font-bold text-sm disabled:opacity-40";

export default function AttendancePage() {
  const today = useMemo(nepalToday, []);
  const [day, setDay] = useState(today);
  const isToday = day === today;

  const [children, setChildren] = useState<Child[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [records, setRecords] = useState<Record<string, AttendanceRow>>({});
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [room, setRoom] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null); // child id, or "all"
  const [absentFor, setAbsentFor] = useState<Child | null>(null);

  const load = useCallback(async () => {
    const [kids, rooms, att, abs] = await Promise.all([
      api<Paged<Child>>("/api/v1/children/?page_size=500"),
      api<Paged<Classroom>>("/api/v1/classrooms/?page_size=500"),
      api<Paged<AttendanceRow>>(`/api/v1/attendance/?date=${day}&page_size=500`),
      api<Paged<Absence>>(`/api/v1/absences/?date=${day}&page_size=500`),
    ]);
    setChildren(kids.results);
    setClassrooms(rooms.results);
    setRecords(Object.fromEntries(att.results.map((r) => [r.child, r])));
    setAbsences(abs.results);
  }, [day]);

  useEffect(() => {
    setLoading(true);
    load()
      .catch((err) => setError(errorText(err)))
      .finally(() => setLoading(false));
  }, [load]);

  const absenceByChild = useMemo(() => Object.fromEntries(absences.map((a) => [a.child, a])), [absences]);

  function statusOf(c: Child): Status {
    const r = records[c.id];
    if (r?.check_out_at) return "left";
    if (r?.check_in_at) return "here";
    if (absenceByChild[c.id]) return "absent";
    return "waiting";
  }

  const visible = children.filter(
    (c) =>
      (!room || c.classroom === room) &&
      `${fullName(c)} ${c.full_name_ne}`.toLowerCase().includes(search.toLowerCase()),
  );
  const count = (s: Status) => visible.filter((c) => statusOf(c) === s).length;

  async function act(child: Child, step: "check-in" | "check-out" | "undo") {
    setError("");
    setBusy(child.id);
    try {
      await api(`/api/v1/attendance/${step}/`, { method: "POST", json: { child: child.id } });
      await load();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(null);
    }
  }

  async function checkInEveryone() {
    const waiting = visible.filter((c) => statusOf(c) === "waiting");
    if (waiting.length === 0 || !window.confirm(`Check in ${waiting.length} children who are not here yet?`)) return;
    setError("");
    setBusy("all");
    try {
      for (const c of waiting) {
        await api("/api/v1/attendance/check-in/", { method: "POST", json: { child: c.id } });
      }
    } catch (err) {
      setError(errorText(err));
    } finally {
      await load();
      setBusy(null);
    }
  }

  async function removeAbsence(a: Absence) {
    if (!window.confirm(`Remove the absence for ${a.child_name}?`)) return;
    try {
      await api(`/api/v1/absences/${a.id}/`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(errorText(err));
    }
  }

  const roomName = (id: string | null) => classrooms.find((r) => r.id === id)?.name ?? "–";
  const prettyDay = new Date(`${day}T12:00:00`).toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const cards: { label: string; value: number; tone: string }[] = [
    { label: "Here now", value: count("here"), tone: "text-[#17432F]" },
    { label: "Gone home", value: count("left"), tone: "text-[#1B3F66]" },
    { label: "Absent", value: count("absent"), tone: "text-[#8A3B12]" },
    { label: "Not arrived", value: count("waiting"), tone: "text-[#5B6170]" },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">Attendance</h1>
          <p className={muted}>{prettyDay}{isToday ? " · Today" : ""}</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className={label}>
            Day
            <input type="date" className={input} value={day} max={today} onChange={(e) => setDay(e.target.value || today)} />
          </label>
          {isToday && (
            <button className={primaryButton} onClick={checkInEveryone} disabled={busy !== null}>
              {busy === "all" ? "Checking in…" : "Check in everyone"}
            </button>
          )}
        </div>
      </div>

      {!isToday && (
        <p className="rounded-xl bg-[#FCEFD7] p-3 text-sm font-semibold">
          You are looking at a past day. Check-in and check-out only work for today.
        </p>
      )}
      {error && <p className={errorStyle}>{error}</p>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className={card}>
            <div className="text-sm font-semibold text-[#5B6170]">{c.label}</div>
            <div className={`text-4xl font-extrabold mt-1 ${c.tone}`}>{loading ? "…" : c.value}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <input className={`${input} flex-1 min-w-56`} placeholder="Search child…" value={search}
          onChange={(e) => setSearch(e.target.value)} />
        <select className={input} value={room} onChange={(e) => setRoom(e.target.value)}>
          <option value="">All classrooms</option>
          {classrooms.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </div>

      <div className={`${card} overflow-x-auto`}>
        {!loading && visible.length === 0 ? (
          <p className={muted}>No children found.</p>
        ) : (
          <table className="text-left [&_th]:px-3 [&_td]:px-3">
            <thead className="text-sm text-[#5B6170]">
              <tr>
                <th className="py-2">Child</th>
                <th className="py-2">Classroom</th>
                <th className="py-2">Status</th>
                <th className="py-2">Arrived</th>
                <th className="py-2">Left</th>
                {isToday && <th className="py-2 whitespace-nowrap">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {visible.map((c) => {
                const s = statusOf(c);
                const r = records[c.id];
                const absence = absenceByChild[c.id];
                const rowBusy = busy !== null;
                return (
                  <tr key={c.id} className="border-t border-[#F0EBE1]">
                    <td className="py-3">
                      <div className="font-bold">{fullName(c)}</div>
                      {c.full_name_ne && <div className={`${muted} text-sm`}>{c.full_name_ne}</div>}
                    </td>
                    <td className="py-3">{roomName(c.classroom)}</td>
                    <td className="py-3">
                      <span className={`text-sm font-bold rounded-full px-3 py-1 whitespace-nowrap ${BADGE[s]}`}>
                        {s === "here" && "Here"}
                        {s === "left" && "Gone home"}
                        {s === "waiting" && "Not arrived"}
                        {s === "absent" && `Absent · ${kindLabel(absence.kind)}`}
                      </span>
                    </td>
                    <td className="py-3">{time(r?.check_in_at ?? null) || "–"}</td>
                    <td className="py-3">{time(r?.check_out_at ?? null) || "–"}</td>
                    {isToday && (
                      <td className="py-3 whitespace-nowrap">
                        <div className="flex gap-2">
                          {(s === "waiting" || s === "absent") && (
                            <button className={`${smallButton} bg-[#1F2A5C] text-white`} disabled={rowBusy}
                              onClick={() => act(c, "check-in")}>
                              Check in
                            </button>
                          )}
                          {s === "here" && (
                            <button className={`${smallButton} bg-[#E9A23B] text-[#1F2A5C]`} disabled={rowBusy}
                              onClick={() => act(c, "check-out")}>
                              Check out
                            </button>
                          )}
                          {s === "waiting" && (
                            <button className={`${smallButton} border border-[#C46A3A] text-[#8A3B12]`}
                              disabled={rowBusy} onClick={() => setAbsentFor(c)}>
                              Mark absent
                            </button>
                          )}
                          {(s === "here" || s === "left") && (
                            <button className={`${smallButton} border border-[#D9D2C4]`} disabled={rowBusy}
                              onClick={() => act(c, "undo")} title="Undo the last check-in or check-out">
                              Undo
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <section className={`${card} flex flex-col gap-3`}>
        <h2 className="text-xl font-bold">Absences on this day</h2>
        {absences.length === 0 ? (
          <p className={muted}>No absences reported.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-[#F0EBE1]">
            {absences.map((a) => (
              <li key={a.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="font-bold">{a.child_name}</span>{" "}
                  <span className={muted}>
                    · {kindLabel(a.kind)} · {a.start_date === a.end_date ? a.start_date : `${a.start_date} → ${a.end_date}`}
                  </span>
                  {a.note && <div className="text-sm">“{a.note}”</div>}
                  <div className={`${muted} text-xs`}>Reported by {a.reported_by_name || "unknown"}</div>
                </div>
                <button className={`${smallButton} border border-[#D9D2C4]`} onClick={() => removeAbsence(a)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {absentFor && (
        <AbsenceDialog
          child={absentFor}
          day={day}
          onClose={() => setAbsentFor(null)}
          onSaved={async () => {
            setAbsentFor(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

function AbsenceDialog({ child, day, onClose, onSaved }: {
  child: Child; day: string; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({ kind: "sick", start_date: day, end_date: day, note: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api("/api/v1/absences/", { method: "POST", json: { ...form, child: child.id } });
      onSaved();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Mark ${fullName(child)} absent`} onClose={onClose}>
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <label className={label}>
          Reason
          <select className={input} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
            {KINDS.map((k) => (
              <option key={k.value} value={k.value}>{k.label}</option>
            ))}
          </select>
        </label>
        <label className={label}>
          From
          <input type="date" className={input} required value={form.start_date}
            onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
        </label>
        <label className={label}>
          To
          <input type="date" className={input} required value={form.end_date}
            onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
        </label>
        <label className={`${label} md:col-span-3`}>
          Note (optional)
          <textarea className={textarea} placeholder="e.g. Mother phoned, fever since yesterday" value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </label>
        {error && <p className={`${errorStyle} md:col-span-3`}>{error}</p>}
        <div className="md:col-span-3 flex gap-3">
          <button className={primaryButton} disabled={saving}>{saving ? "Saving…" : "Save absence"}</button>
          <button type="button" className={secondaryButton} onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}
