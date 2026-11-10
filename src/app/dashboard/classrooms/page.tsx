"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import { card, errorStyle, input, label, muted, primaryButton } from "@/components/ui";
import { api, type Paged } from "@/lib/api";
import { errorText } from "@/lib/errors";
import type { Child, Classroom } from "@/lib/types";

export default function ClassroomsPage() {
  const [rooms, setRooms] = useState<Classroom[] | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [form, setForm] = useState({ name: "", age_group: "" });
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [r, c] = await Promise.all([
      api<Paged<Classroom>>("/api/v1/classrooms/"),
      api<Paged<Child>>("/api/v1/children/"),
    ]);
    setRooms(r.results);
    setChildren(c.results);
  }, []);

  useEffect(() => {
    load().catch((err) => setError(errorText(err)));
  }, [load]);

  async function addRoom(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api("/api/v1/classrooms/", { method: "POST", json: { ...form, guides: [] } });
      setForm({ name: "", age_group: "" });
      await load();
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <h1 className="text-3xl font-extrabold">Classrooms</h1>

      <form onSubmit={addRoom} className={`${card} flex flex-wrap items-end gap-3`}>
        <label className={`${label} flex-1 min-w-48`}>
          Name *
          <input className={input} required placeholder="Sunflower" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <label className={`${label} flex-1 min-w-48`}>
          Age group
          <input className={input} placeholder="3–6 years" value={form.age_group}
            onChange={(e) => setForm({ ...form, age_group: e.target.value })} />
        </label>
        <button className={primaryButton}>+ Add classroom</button>
      </form>

      {error && <p className={errorStyle}>{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rooms?.length === 0 && <p className={muted}>No classrooms yet.</p>}
        {rooms?.map((r) => {
          const count = children.filter((c) => c.classroom === r.id).length;
          return (
            <div key={r.id} className={card}>
              <div className="text-xl font-bold">{r.name}</div>
              <div className={muted}>{r.age_group || "Age group not set"}</div>
              <div className="mt-3 text-sm font-semibold">
                {count} {count === 1 ? "child" : "children"} · {r.guides.length} guide{r.guides.length === 1 ? "" : "s"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
