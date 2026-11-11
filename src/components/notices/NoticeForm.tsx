"use client";

import { type FormEvent, useState } from "react";
import Modal from "@/components/Modal";
import { dangerButton, errorStyle, input, label, muted, primaryButton, secondaryButton, textarea } from "@/components/ui";
import { api } from "@/lib/api";
import { errorText } from "@/lib/errors";
import { toNepali } from "@/lib/nepaliTyping";
import { NOTICE_IDEAS, type Notice } from "@/lib/notices";
import type { Classroom } from "@/lib/types";

type Props = {
  notice: Notice | null;
  classrooms: Classroom[];
  onClose: () => void;
  onSaved: () => Promise<void>;
};

export default function NoticeForm({ notice, classrooms, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    title: notice?.title ?? "",
    body: notice?.body ?? "",
    classroom: notice?.classroom ?? "",
    is_pinned: notice?.is_pinned ?? false,
  });
  // Nepali typing: type in English letters, we write Nepali into the real fields
  const [nepali, setNepali] = useState(false);
  const [roman, setRoman] = useState({ title: "", body: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function typeRoman(key: "title" | "body", value: string) {
    setRoman((r) => ({ ...r, [key]: value }));
    setForm((f) => ({ ...f, [key]: toNepali(value) }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const json = { ...form, classroom: form.classroom || null };
      if (notice) await api(`/api/v1/notices/${notice.id}/`, { method: "PATCH", json });
      else await api("/api/v1/notices/", { method: "POST", json });
      await onSaved();
    } catch (err) {
      setError(errorText(err));
      setSaving(false);
    }
  }

  async function remove() {
    if (!notice || !window.confirm(`Delete the notice “${notice.title}”? Parents will no longer see it.`)) return;
    try {
      await api(`/api/v1/notices/${notice.id}/`, { method: "DELETE" });
      await onSaved();
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <Modal title={notice ? "Edit notice" : "New notice"} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4 max-w-3xl">
        {!notice && (
          <div className="flex flex-wrap gap-2">
            {NOTICE_IDEAS.map((idea) => (
              <button
                type="button"
                key={idea.title}
                onClick={() => setForm({ ...form, title: idea.title, body: idea.body })}
                className="rounded-full border border-[#E7E1D6] bg-white px-3 py-1 text-sm hover:border-[#1F2A5C]"
              >
                {idea.title}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-end gap-4">
          <label className={`${label} w-56`}>
            Send to
            <select className={input} value={form.classroom} onChange={(e) => setForm({ ...form, classroom: e.target.value })}>
              <option value="">Whole school (all parents)</option>
              {classrooms.map((r) => (
                <option key={r.id} value={r.id}>
                  Class: {r.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 h-11">
            <input type="checkbox" checked={form.is_pinned} onChange={(e) => setForm({ ...form, is_pinned: e.target.checked })} />
            📌 Pin to top
          </label>
          <label className="flex items-center gap-2 h-11">
            <input type="checkbox" checked={nepali} onChange={(e) => setNepali(e.target.checked)} />
            नेपाली — type Nepali with English letters
          </label>
        </div>

        {nepali && (
          <div className="rounded-lg bg-[#FBF7F0] border border-[#E7E1D6] p-3 flex flex-col gap-3">
            <p className={muted}>Type here in English letters (e.g. “bidaa” → “बिदा”). The Nepali text appears in the boxes below, where you can still fix it.</p>
            <input
              className={input}
              placeholder="Title in English letters, e.g. Tihar bidaa"
              value={roman.title}
              onChange={(e) => typeRoman("title", e.target.value)}
            />
            <textarea
              className={textarea}
              rows={3}
              placeholder="Message in English letters"
              value={roman.body}
              onChange={(e) => typeRoman("body", e.target.value)}
            />
          </div>
        )}

        <label className={label}>
          Title
          <input className={input} required maxLength={150} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </label>
        <label className={label}>
          Message
          <textarea
            className={textarea}
            required
            rows={7}
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
          />
        </label>

        {error && <p className={errorStyle}>{error}</p>}
        <div className="flex justify-between gap-2">
          {notice ? (
            <button type="button" className={dangerButton} onClick={remove}>
              Delete notice
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" className={secondaryButton} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={primaryButton} disabled={saving}>
              {saving ? "Saving…" : notice ? "Save" : "Publish notice"}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
