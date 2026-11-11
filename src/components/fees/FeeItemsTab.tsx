"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import Modal from "@/components/Modal";
import { card, errorStyle, input, label, muted, primaryButton, secondaryButton } from "@/components/ui";
import { api, type Paged } from "@/lib/api";
import { errorText } from "@/lib/errors";
import { COMMON_FEES, type FeeItem, FREQUENCIES, npr } from "@/lib/fees";

const EMPTY = { name: "", name_ne: "", amount: "", frequency: "monthly" };

export default function FeeItemsTab() {
  const [items, setItems] = useState<FeeItem[] | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<FeeItem | null>(null);

  const load = useCallback(async () => {
    setItems((await api<Paged<FeeItem>>("/api/v1/fee-items/?page_size=500")).results);
  }, []);

  useEffect(() => {
    load().catch((err) => setError(errorText(err)));
  }, [load]);

  async function add(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api("/api/v1/fee-items/", { method: "POST", json: form });
      setForm(EMPTY);
      await load();
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <form onSubmit={add} className={`${card} grid grid-cols-1 md:grid-cols-4 gap-3 items-end`}>
        <div className="md:col-span-4 flex flex-col gap-2">
          <span className="text-sm font-semibold">Quick add (then type the amount)</span>
          <div className="flex flex-wrap gap-2">
            {COMMON_FEES.filter((c) => !(items ?? []).some((i) => i.name.toLowerCase() === c.name.toLowerCase())).map(
              (c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setForm({ ...form, name: c.name, name_ne: c.name_ne, frequency: c.frequency })}
                  className="h-9 px-3 rounded-full bg-[#F3ECDF] text-sm font-bold hover:bg-[#EADFCB]"
                >
                  + {c.name}
                  {c.frequency === "one_time" ? " (one-time)" : ""}
                </button>
              ),
            )}
          </div>
        </div>
        <label className={label}>
          Fee name (English)
          <input
            className={input}
            required
            placeholder="Monthly tuition fee"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <label className={label}>
          Fee name (नेपाली)
          <input
            className={input}
            lang="ne"
            placeholder="मासिक शिक्षण शुल्क"
            value={form.name_ne}
            onChange={(e) => setForm({ ...form, name_ne: e.target.value })}
          />
        </label>
        <label className={label}>
          Amount (NPR)
          <input
            className={input}
            type="number"
            min="0"
            step="0.01"
            required
            placeholder="8500"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
        </label>
        <label className={label}>
          How often
          <select
            className={input}
            value={form.frequency}
            onChange={(e) => setForm({ ...form, frequency: e.target.value })}
          >
            {FREQUENCIES.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </label>
        <div className="md:col-span-4 flex flex-wrap items-center gap-3">
          <button className={primaryButton}>+ Add fee item</button>
          <span className={`${muted} text-sm`}>
            Monthly fees appear on every invoice. One-time fees (e.g. admission) appear once, on the child&apos;s next
            invoice.
          </span>
        </div>
      </form>

      {error && <p className={errorStyle}>{error}</p>}

      <div className={`${card} overflow-x-auto`}>
        {items?.length === 0 ? (
          <p className={muted}>No fee items yet. Add tuition, meals, school van… above.</p>
        ) : (
          <table className="text-left [&_th]:px-3 [&_td]:px-3">
            <thead className="text-sm text-[#5B6170]">
              <tr>
                <th className="py-2">Fee</th>
                <th className="py-2 text-right">Amount</th>
                <th className="py-2">How often</th>
                <th className="py-2">Status</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(items ?? []).map((item) => (
                <tr key={item.id} className="border-t border-[#F0EBE1]">
                  <td className="py-3">
                    <div className="font-bold">{item.name}</div>
                    {item.name_ne && <div className={`${muted} text-sm`}>{item.name_ne}</div>}
                  </td>
                  <td className="py-3 text-right whitespace-nowrap">{npr(item.amount)}</td>
                  <td className="py-3">{FREQUENCIES.find((f) => f.value === item.frequency)?.label}</td>
                  <td className="py-3">{item.is_active ? "Active" : <span className={muted}>Not used</span>}</td>
                  <td className="py-3">
                    <button
                      className="h-9 px-4 rounded-lg border border-[#1F2A5C] font-bold text-sm hover:bg-[#F3ECDF]"
                      onClick={() => setEditing(item)}
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
        <EditFeeItem
          item={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

function EditFeeItem({ item, onClose, onSaved }: { item: FeeItem; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: item.name,
    name_ne: item.name_ne,
    amount: item.amount,
    frequency: item.frequency,
    is_active: item.is_active,
  });
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api(`/api/v1/fee-items/${item.id}/`, { method: "PATCH", json: form });
      onSaved();
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <Modal title={`Edit ${item.name}`} onClose={onClose}>
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <label className={label}>
          Fee name (English)
          <input
            className={input}
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <label className={label}>
          Fee name (नेपाली)
          <input
            className={input}
            lang="ne"
            value={form.name_ne}
            onChange={(e) => setForm({ ...form, name_ne: e.target.value })}
          />
        </label>
        <label className={label}>
          Amount (NPR)
          <input
            className={input}
            type="number"
            min="0"
            step="0.01"
            required
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
        </label>
        <label className={label}>
          How often
          <select
            className={input}
            value={form.frequency}
            onChange={(e) => setForm({ ...form, frequency: e.target.value })}
          >
            {FREQUENCIES.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold md:col-span-3">
          <input
            type="checkbox"
            className="w-5 h-5"
            checked={form.is_active}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
          />
          Active (untick to stop charging it on new invoices)
        </label>
        <p className={`${muted} text-sm md:col-span-3`}>
          Changing the amount affects new invoices only. Invoices already generated keep their amounts.
        </p>
        {error && <p className={`${errorStyle} md:col-span-3`}>{error}</p>}
        <div className="md:col-span-3 flex gap-3">
          <button className={primaryButton}>Save</button>
          <button type="button" className={secondaryButton} onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
