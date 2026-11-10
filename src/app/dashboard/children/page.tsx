"use client";

import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { card, errorStyle, input, label, muted, primaryButton, secondaryButton } from "@/components/ui";
import { api, type Paged } from "@/lib/api";
import { errorText } from "@/lib/errors";
import { age, type Child, type Classroom, fullName } from "@/lib/types";

const EMPTY = { first_name: "", last_name: "", date_of_birth: "", gender: "", classroom: "", photo_consent: false };

export default function ChildrenPage() {
  const [children, setChildren] = useState<Child[] | null>(null);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [search, setSearch] = useState("");
  const [roomFilter, setRoomFilter] = useState("");
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [kids, rooms] = await Promise.all([
      api<Paged<Child>>("/api/v1/children/"),
      api<Paged<Classroom>>("/api/v1/classrooms/"),
    ]);
    setChildren(kids.results);
    setClassrooms(rooms.results);
  }, []);

  useEffect(() => {
    load().catch((err) => setError(errorText(err)));
  }, [load]);

  async function addChild(e: FormEvent) {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      await api("/api/v1/children/", {
        method: "POST",
        json: { ...form, date_of_birth: form.date_of_birth || null, classroom: form.classroom || null },
      });
      setForm(EMPTY);
      setShowForm(false);
      await load();
    } catch (err) {
      setFormError(errorText(err));
    } finally {
      setSaving(false);
    }
  }

  const roomName = (id: string | null) => classrooms.find((r) => r.id === id)?.name ?? "–";
  const visible = (children ?? []).filter(
    (c) =>
      fullName(c).toLowerCase().includes(search.toLowerCase()) && (!roomFilter || c.classroom === roomFilter),
  );

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">Children</h1>
          <p className={muted}>{children ? `${children.length} enrolled` : "Loading…"}</p>
        </div>
        <button className={primaryButton} onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Close" : "+ Add child"}
        </button>
      </div>

      {error && <p className={errorStyle}>{error}</p>}

      {showForm && (
        <form onSubmit={addChild} className={`${card} grid grid-cols-1 md:grid-cols-3 gap-4`}>
          <label className={label}>
            First name *
            <input className={input} required value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
          </label>
          <label className={label}>
            Last name
            <input className={input} value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
          </label>
          <label className={label}>
            Date of birth (AD)
            <input className={input} type="date" value={form.date_of_birth}
              onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
          </label>
          <label className={label}>
            Gender
            <select className={input} value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
              <option value="">Not specified</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className={label}>
            Classroom
            <select className={input} value={form.classroom}
              onChange={(e) => setForm({ ...form, classroom: e.target.value })}>
              <option value="">No classroom yet</option>
              {classrooms.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold mt-6">
            <input type="checkbox" className="w-5 h-5" checked={form.photo_consent}
              onChange={(e) => setForm({ ...form, photo_consent: e.target.checked })} />
            Parents agree to photos
          </label>
          {formError && <p className={`${errorStyle} md:col-span-3`}>{formError}</p>}
          <div className="md:col-span-3 flex gap-3">
            <button className={primaryButton} disabled={saving}>{saving ? "Saving…" : "Save child"}</button>
            <button type="button" className={secondaryButton} onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="flex flex-wrap gap-3">
        <input className={`${input} flex-1 min-w-56`} placeholder="Search by name…" value={search}
          onChange={(e) => setSearch(e.target.value)} />
        <select className={input} value={roomFilter} onChange={(e) => setRoomFilter(e.target.value)}>
          <option value="">All classrooms</option>
          {classrooms.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </div>

      <div className={`${card} overflow-x-auto`}>
        {children && visible.length === 0 ? (
          <p className={muted}>No children found.</p>
        ) : (
          <table className="w-full text-left">
            <thead className="text-sm text-[#5B6170]">
              <tr>
                <th className="py-2">Name</th>
                <th className="py-2">Age</th>
                <th className="py-2">Birthday (BS)</th>
                <th className="py-2">Classroom</th>
                <th className="py-2">Parents</th>
                <th className="py-2">Photos</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((c) => (
                <tr key={c.id} className="border-t border-[#F0EBE1]">
                  <td className="py-3">
                    <Link href={`/dashboard/children/${c.id}`} className="font-bold hover:underline">
                      {fullName(c)}
                    </Link>
                  </td>
                  <td className="py-3">{age(c.date_of_birth)}</td>
                  <td className="py-3">{c.date_of_birth_bs ?? "–"}</td>
                  <td className="py-3">{roomName(c.classroom)}</td>
                  <td className="py-3">{c.guardians.length}</td>
                  <td className="py-3">{c.photo_consent ? "✓ Yes" : "✗ No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
