"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import {
  card, dangerButton, errorStyle, input, label, muted, primaryButton, textarea,
} from "@/components/ui";
import { api, type Paged } from "@/lib/api";
import { errorText } from "@/lib/errors";
import { age, type Child, type Classroom, fullName, RELATIONS } from "@/lib/types";

const EMPTY_PARENT = { phone_number: "", full_name: "", relation: "mother", can_pickup: true, is_primary: false };

export default function ChildPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [child, setChild] = useState<Child | null>(null);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [error, setError] = useState("");

  const [details, setDetails] = useState({ preferred_name: "", classroom: "", allergies: "", photo_consent: false });
  const [detailsMsg, setDetailsMsg] = useState("");

  const [parent, setParent] = useState(EMPTY_PARENT);
  const [parentError, setParentError] = useState("");
  const [savingParent, setSavingParent] = useState(false);

  const load = useCallback(async () => {
    const [c, rooms] = await Promise.all([
      api<Child>(`/api/v1/children/${id}/`),
      api<Paged<Classroom>>("/api/v1/classrooms/"),
    ]);
    setChild(c);
    setClassrooms(rooms.results);
    setDetails({
      preferred_name: c.preferred_name,
      classroom: c.classroom ?? "",
      allergies: c.allergies,
      photo_consent: c.photo_consent,
    });
  }, [id]);

  useEffect(() => {
    load().catch((err) => setError(errorText(err)));
  }, [load]);

  async function saveDetails(e: FormEvent) {
    e.preventDefault();
    setDetailsMsg("");
    try {
      await api(`/api/v1/children/${id}/`, {
        method: "PATCH",
        json: { ...details, classroom: details.classroom || null },
      });
      setDetailsMsg("Saved ✓");
      await load();
    } catch (err) {
      setDetailsMsg(errorText(err));
    }
  }

  async function addParent(e: FormEvent) {
    e.preventDefault();
    setParentError("");
    setSavingParent(true);
    try {
      await api(`/api/v1/children/${id}/guardians/`, { method: "POST", json: parent });
      setParent(EMPTY_PARENT);
      await load();
    } catch (err) {
      setParentError(errorText(err));
    } finally {
      setSavingParent(false);
    }
  }

  async function markAsLeft() {
    if (!child || !window.confirm(`Mark ${fullName(child)} as left the school? Their history is kept.`)) return;
    try {
      await api(`/api/v1/children/${id}/`, { method: "DELETE" });
      router.push("/dashboard/children");
    } catch (err) {
      setError(errorText(err));
    }
  }

  if (error) return <p className={errorStyle}>{error}</p>;
  if (!child) return <p className={muted}>Loading…</p>;

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <Link href="/dashboard/children" className="text-sm hover:underline">← All children</Link>
        <h1 className="text-3xl font-extrabold mt-1">{fullName(child)}</h1>
        <p className={muted}>
          {age(child.date_of_birth)} · Born {child.date_of_birth ?? "–"} AD / {child.date_of_birth_bs ?? "–"} BS
        </p>
      </div>

      <form onSubmit={saveDetails} className={`${card} grid grid-cols-1 md:grid-cols-2 gap-4`}>
        <h2 className="md:col-span-2 text-xl font-bold">Details</h2>
        <label className={label}>
          Called (nickname)
          <input className={input} value={details.preferred_name}
            onChange={(e) => setDetails({ ...details, preferred_name: e.target.value })} />
        </label>
        <label className={label}>
          Classroom
          <select className={input} value={details.classroom}
            onChange={(e) => setDetails({ ...details, classroom: e.target.value })}>
            <option value="">No classroom</option>
            {classrooms.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </label>
        <label className={`${label} md:col-span-2`}>
          Allergies and health notes (staff and parents only)
          <textarea className={textarea} value={details.allergies}
            onChange={(e) => setDetails({ ...details, allergies: e.target.value })} />
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" className="w-5 h-5" checked={details.photo_consent}
            onChange={(e) => setDetails({ ...details, photo_consent: e.target.checked })} />
          Parents agree to photos
        </label>
        <div className="md:col-span-2 flex items-center gap-3">
          <button className={primaryButton}>Save details</button>
          {detailsMsg && <span className="text-sm">{detailsMsg}</span>}
        </div>
      </form>

      <section className={`${card} flex flex-col gap-4`}>
        <h2 className="text-xl font-bold">Parents and guardians</h2>
        {child.guardians.length === 0 ? (
          <p className={muted}>No parents linked yet. Add one below. They can then log in to the KidSathi app with an SMS code.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-[#F0EBE1]">
            {child.guardians.map((g) => (
              <li key={g.id} className="py-3 flex flex-wrap justify-between gap-2">
                <span>
                  <span className="font-bold">{g.full_name || "(no name)"}</span>{" "}
                  <span className={muted}>· {RELATIONS.find((r) => r.value === g.relation)?.label ?? g.relation}</span>
                  {g.is_primary && <span className="ml-2 text-xs font-bold bg-[#FCEFD7] rounded px-2 py-0.5">Primary</span>}
                </span>
                <span className="text-sm">
                  {g.phone_number} · {g.can_pickup ? "Can pick up ✓" : "Cannot pick up"}
                </span>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={addParent} className="grid grid-cols-1 md:grid-cols-4 gap-3 border-t border-[#F0EBE1] pt-4">
          <label className={label}>
            Mobile number *
            <input className={input} required placeholder="98XXXXXXXX" value={parent.phone_number}
              onChange={(e) => setParent({ ...parent, phone_number: e.target.value })} />
          </label>
          <label className={label}>
            Full name *
            <input className={input} required value={parent.full_name}
              onChange={(e) => setParent({ ...parent, full_name: e.target.value })} />
          </label>
          <label className={label}>
            Relation
            <select className={input} value={parent.relation}
              onChange={(e) => setParent({ ...parent, relation: e.target.value })}>
              {RELATIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </label>
          <div className="flex flex-col justify-end gap-1 text-sm font-semibold">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={parent.can_pickup}
                onChange={(e) => setParent({ ...parent, can_pickup: e.target.checked })} />
              Can pick up
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={parent.is_primary}
                onChange={(e) => setParent({ ...parent, is_primary: e.target.checked })} />
              Primary contact
            </label>
          </div>
          {parentError && <p className={`${errorStyle} md:col-span-4`}>{parentError}</p>}
          <div className="md:col-span-4">
            <button className={primaryButton} disabled={savingParent}>
              {savingParent ? "Adding…" : "+ Add parent"}
            </button>
          </div>
        </form>
      </section>

      <section className={`${card} flex flex-wrap items-center justify-between gap-3`}>
        <div>
          <h2 className="font-bold">Leaving the school</h2>
          <p className={`${muted} text-sm`}>The child disappears from lists, but attendance and invoices are kept.</p>
        </div>
        <button className={dangerButton} onClick={markAsLeft}>Mark as left</button>
      </section>
    </div>
  );
}
