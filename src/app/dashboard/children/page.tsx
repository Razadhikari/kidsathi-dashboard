"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import ChildForm from "@/components/ChildForm";
import Modal from "@/components/Modal";
import { card, errorStyle, input, muted, primaryButton } from "@/components/ui";
import { api, type Paged } from "@/lib/api";
import { errorText } from "@/lib/errors";
import { age, type Child, type Classroom, fullName } from "@/lib/types";

/** "Deepa Sharma" + "Raju Sharma" → "Deepa / Raju" */
function parentFirstNames(child: Child): string {
  return child.guardians.map((g) => (g.full_name || g.phone_number).trim().split(" ")[0]).join(" / ");
}

export default function ChildrenPage() {
  const [children, setChildren] = useState<Child[] | null>(null);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [search, setSearch] = useState("");
  const [roomFilter, setRoomFilter] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Child | "new" | null>(null);

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

  async function onSaved() {
    setEditing(null);
    await load();
  }

  const roomName = (id: string | null) => classrooms.find((r) => r.id === id)?.name ?? "–";
  const visible = (children ?? []).filter((c) => {
    const text = `${fullName(c)} ${c.full_name_ne}`.toLowerCase();
    return text.includes(search.toLowerCase()) && (!roomFilter || c.classroom === roomFilter);
  });

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">Children</h1>
          <p className={muted}>{children ? `${children.length} enrolled` : "Loading…"}</p>
        </div>
        <button className={primaryButton} onClick={() => setEditing("new")}>+ Add child</button>
      </div>

      {error && <p className={errorStyle}>{error}</p>}

      <div className="flex flex-wrap gap-3">
        <input className={`${input} flex-1 min-w-56`} placeholder="Search by name (English or नेपाली)…" value={search}
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
                <th className="py-2">Photos</th>
                <th className="py-2 pr-6 whitespace-nowrap">Parents</th>
                <th className="py-2 w-px whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((c) => (
                <tr key={c.id} className="border-t border-[#F0EBE1]">
                  <td className="py-3">
                    <Link href={`/dashboard/children/${c.id}`} className="font-bold hover:underline">
                      {fullName(c)}
                    </Link>
                    {c.full_name_ne && <div className={`${muted} text-sm`}>{c.full_name_ne}</div>}
                  </td>
                  <td className="py-3">{age(c.date_of_birth)}</td>
                  <td className="py-3">{c.date_of_birth_bs ?? "–"}</td>
                  <td className="py-3">{roomName(c.classroom)}</td>
                  <td className="py-3">{c.photo_consent ? "✓ Yes" : "✗ No"}</td>
                  <td className="py-3 pr-6 whitespace-nowrap">
                    {c.guardians.length > 0 ? (
                      <Link href={`/dashboard/children/${c.id}`} className="font-semibold hover:underline"
                        title="Manage parents">
                        {parentFirstNames(c)}
                      </Link>
                    ) : (
                      <Link href={`/dashboard/children/${c.id}`}
                        className="text-sm font-bold text-[#B45309] hover:underline">
                        + Add parent
                      </Link>
                    )}
                  </td>
                  <td className="py-3 w-px whitespace-nowrap">
                    <button
                      onClick={() => setEditing(c)}
                      className="h-9 px-4 rounded-lg border border-[#1F2A5C] font-bold text-sm hover:bg-[#F3ECDF]"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <Modal
          title={editing === "new" ? "New admission" : `Edit ${fullName(editing)}`}
          onClose={() => setEditing(null)}
        >
          <ChildForm
            key={editing === "new" ? "new" : editing.id}
            child={editing === "new" ? undefined : editing}
            classrooms={classrooms}
            onSaved={onSaved}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}
    </div>
  );
}
