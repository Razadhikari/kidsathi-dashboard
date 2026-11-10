"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import ChildForm from "@/components/ChildForm";
import DeleteChildDialog from "@/components/DeleteChildDialog";
import Modal from "@/components/Modal";
import { card, errorStyle, input, muted, primaryButton } from "@/components/ui";
import { api, type Paged } from "@/lib/api";
import { errorText } from "@/lib/errors";
import { age, type Child, type Classroom, fullName } from "@/lib/types";

type Tab = "active" | "left";

/** "Deepa Sharma" + "Raju Sharma" → "Deepa / Raju" */
function parentFirstNames(child: Child): string {
  return child.guardians.map((g) => (g.full_name || g.phone_number).trim().split(" ")[0]).join(" / ");
}

const smallButton = "h-9 px-4 rounded-lg font-bold text-sm";

export default function ChildrenPage() {
  const [tab, setTab] = useState<Tab>("active");
  const [children, setChildren] = useState<Child[] | null>(null);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [search, setSearch] = useState("");
  const [roomFilter, setRoomFilter] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Child | "new" | null>(null);
  const [deleting, setDeleting] = useState<Child | null>(null);

  const load = useCallback(async () => {
    const [kids, rooms] = await Promise.all([
      api<Paged<Child>>(`/api/v1/children/?status=${tab}`),
      api<Paged<Classroom>>("/api/v1/classrooms/"),
    ]);
    setChildren(kids.results);
    setClassrooms(rooms.results);
  }, [tab]);

  useEffect(() => {
    setChildren(null);
    load().catch((err) => setError(errorText(err)));
  }, [load]);

  async function restore(child: Child) {
    setError("");
    try {
      await api(`/api/v1/children/${child.id}/restore/`, { method: "POST" });
      await load();
    } catch (err) {
      setError(errorText(err));
    }
  }

  async function afterChange() {
    setEditing(null);
    setDeleting(null);
    await load();
  }

  const roomName = (id: string | null) => classrooms.find((r) => r.id === id)?.name ?? "–";
  const visible = (children ?? []).filter((c) => {
    const text = `${fullName(c)} ${c.full_name_ne}`.toLowerCase();
    return text.includes(search.toLowerCase()) && (!roomFilter || c.classroom === roomFilter);
  });

  const tabButton = (value: Tab, text: string) => (
    <button
      onClick={() => setTab(value)}
      className={`h-10 px-4 rounded-lg font-bold ${tab === value ? "bg-[#1F2A5C] text-white" : "bg-white border border-[#E7E1D6]"}`}
    >
      {text}
    </button>
  );

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">Children</h1>
          <p className={muted}>
            {children ? `${children.length} ${tab === "active" ? "enrolled" : "left the school"}` : "Loading…"}
          </p>
        </div>
        {tab === "active" && (
          <button className={primaryButton} onClick={() => setEditing("new")}>+ Add child</button>
        )}
      </div>

      <div className="flex gap-2">
        {tabButton("active", "Current")}
        {tabButton("left", "Left school")}
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
          <p className={muted}>{tab === "active" ? "No children found." : "No former students."}</p>
        ) : (
          <table className="text-left [&_th]:px-3 [&_td]:px-3">
            <thead className="text-sm text-[#5B6170]">
              <tr>
                <th className="py-2">Name</th>
                <th className="py-2">Age</th>
                <th className="py-2">Birthday (BS)</th>
                <th className="py-2">Classroom</th>
                <th className="py-2">Photos</th>
                <th className="py-2 whitespace-nowrap">Parents</th>
                <th className="py-2 whitespace-nowrap">Actions</th>
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
                  <td className="py-3 whitespace-nowrap">
                    {c.guardians.length > 0 ? (
                      <Link href={`/dashboard/children/${c.id}`} className="font-semibold hover:underline"
                        title="Manage parents">
                        {parentFirstNames(c)}
                      </Link>
                    ) : tab === "active" ? (
                      <Link href={`/dashboard/children/${c.id}`}
                        className="text-sm font-bold text-[#B45309] hover:underline">
                        + Add parent
                      </Link>
                    ) : (
                      "–"
                    )}
                  </td>
                  <td className="py-3 whitespace-nowrap">
                    {tab === "active" ? (
                      <button onClick={() => setEditing(c)}
                        className={`${smallButton} border border-[#1F2A5C] hover:bg-[#F3ECDF]`}>
                        Edit
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={() => restore(c)} className={`${smallButton} bg-[#1F2A5C] text-white`}>
                          Restore
                        </button>
                        <button onClick={() => setDeleting(c)}
                          className={`${smallButton} border border-[#B4233C] text-[#B4233C] hover:bg-[#FBEBEB]`}>
                          Delete
                        </button>
                      </div>
                    )}
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
            onSaved={afterChange}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}

      {deleting && <DeleteChildDialog child={deleting} onClose={() => setDeleting(null)} onDeleted={afterChange} />}
    </div>
  );
}
