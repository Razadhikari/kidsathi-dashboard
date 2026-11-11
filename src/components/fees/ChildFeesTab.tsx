"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import { card, errorStyle, input, label, muted, primaryButton } from "@/components/ui";
import { api, type Paged } from "@/lib/api";
import { errorText } from "@/lib/errors";
import { type ChildFee, type FeeItem, npr } from "@/lib/fees";
import { type Child, type Classroom, fullName } from "@/lib/types";

export default function ChildFeesTab() {
  const [children, setChildren] = useState<Child[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [items, setItems] = useState<FeeItem[]>([]);
  const [assigned, setAssigned] = useState<ChildFee[]>([]);
  const [form, setForm] = useState({ fee_item: "", target: "all", amount_override: "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    const [kids, rooms, fees, links] = await Promise.all([
      api<Paged<Child>>("/api/v1/children/?page_size=500"),
      api<Paged<Classroom>>("/api/v1/classrooms/?page_size=500"),
      api<Paged<FeeItem>>("/api/v1/fee-items/?page_size=500"),
      api<Paged<ChildFee>>("/api/v1/child-fees/?page_size=500"),
    ]);
    setChildren(kids.results);
    setClassrooms(rooms.results);
    setItems(fees.results.filter((f) => f.is_active));
    setAssigned(links.results);
  }, []);

  useEffect(() => {
    load().catch((err) => setError(errorText(err)));
  }, [load]);

  /** "all" → every child, "room:<id>" → one class, "child:<id>" → one child */
  function targets(): Child[] {
    if (form.target === "all") return children;
    const [kind, id] = form.target.split(":");
    return children.filter((c) => (kind === "room" ? c.classroom === id : c.id === id));
  }

  async function assign(e: FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    setWorking(true);
    let added = 0;
    let skipped = 0;
    try {
      for (const child of targets()) {
        if (assigned.some((a) => a.child === child.id && a.fee_item === form.fee_item)) {
          skipped += 1;
          continue;
        }
        await api("/api/v1/child-fees/", {
          method: "POST",
          json: { child: child.id, fee_item: form.fee_item, amount_override: form.amount_override || null },
        });
        added += 1;
      }
      setNotice(`Assigned to ${added} child(ren).${skipped ? ` ${skipped} already had this fee.` : ""}`);
    } catch (err) {
      setError(errorText(err));
    } finally {
      await load();
      setWorking(false);
    }
  }

  async function remove(link: ChildFee) {
    if (!window.confirm(`Stop charging “${link.fee_name}” to ${link.child_name}?`)) return;
    try {
      await api(`/api/v1/child-fees/${link.id}/`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(errorText(err));
    }
  }

  const itemById = Object.fromEntries(items.map((i) => [i.id, i]));
  const roomName = (id: string | null) => classrooms.find((r) => r.id === id)?.name ?? "–";

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <form onSubmit={assign} className={`${card} grid grid-cols-1 md:grid-cols-4 gap-3 items-end`}>
        <label className={label}>
          Fee
          <select
            className={input}
            required
            value={form.fee_item}
            onChange={(e) => setForm({ ...form, fee_item: e.target.value })}
          >
            <option value="">Choose a fee</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} · {npr(i.amount)}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          Assign to
          <select className={input} value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })}>
            <option value="all">All children</option>
            <optgroup label="A whole class">
              {classrooms.map((r) => (
                <option key={r.id} value={`room:${r.id}`}>{r.name}</option>
              ))}
            </optgroup>
            <optgroup label="One child">
              {children.map((c) => (
                <option key={c.id} value={`child:${c.id}`}>{fullName(c)}</option>
              ))}
            </optgroup>
          </select>
        </label>
        <label className={label}>
          Special price (optional)
          <input
            className={input}
            type="number"
            min="0"
            step="0.01"
            placeholder="Normal price"
            value={form.amount_override}
            onChange={(e) => setForm({ ...form, amount_override: e.target.value })}
          />
        </label>
        <button className={primaryButton} disabled={working}>
          {working ? "Assigning…" : "Assign fee"}
        </button>
      </form>

      {notice && <p className="rounded-xl bg-[#E7F1FB] p-3 text-sm font-semibold">{notice}</p>}
      {error && <p className={errorStyle}>{error}</p>}

      <div className={`${card} overflow-x-auto`}>
        {children.length === 0 ? (
          <p className={muted}>No children yet.</p>
        ) : (
          <table className="text-left [&_th]:px-3 [&_td]:px-3">
            <thead className="text-sm text-[#5B6170]">
              <tr>
                <th className="py-2">Child</th>
                <th className="py-2">Classroom</th>
                <th className="py-2">Fees</th>
                <th className="py-2 text-right whitespace-nowrap">Monthly total</th>
              </tr>
            </thead>
            <tbody>
              {children.map((c) => {
                const mine = assigned.filter((a) => a.child === c.id);
                const monthly = mine
                  .filter((a) => itemById[a.fee_item]?.frequency === "monthly")
                  .reduce((s, a) => s + Number(a.effective_amount), 0);
                return (
                  <tr key={c.id} className="border-t border-[#F0EBE1] align-top">
                    <td className="py-3 font-bold whitespace-nowrap">{fullName(c)}</td>
                    <td className="py-3">{roomName(c.classroom)}</td>
                    <td className="py-3">
                      {mine.length === 0 ? (
                        <span className={`${muted} text-sm`}>No fees</span>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {mine.map((a) => (
                            <span
                              key={a.id}
                              className="inline-flex items-center gap-1 rounded-full bg-[#F3ECDF] pl-3 pr-1 py-1 text-sm"
                            >
                              {a.fee_name} · {npr(a.effective_amount)}
                              {a.amount_override !== null && <span className="text-xs font-bold">(special)</span>}
                              {itemById[a.fee_item]?.frequency === "one_time" && (
                                <span className="text-xs font-bold">
                                  {a.already_billed ? "(one-time · billed ✓)" : "(one-time · next invoice)"}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => remove(a)}
                                aria-label={`Remove ${a.fee_name}`}
                                className="w-6 h-6 rounded-full hover:bg-[#EADFCB] font-bold"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-3 text-right font-bold whitespace-nowrap">{npr(monthly)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
