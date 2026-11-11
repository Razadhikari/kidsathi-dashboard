"use client";

import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Modal from "@/components/Modal";
import { card, errorStyle, input, label, muted, primaryButton, secondaryButton, textarea } from "@/components/ui";
import { api } from "@/lib/api";
import { errorText } from "@/lib/errors";
import { asList, type Message, type Thread, when } from "@/lib/notices";
import { type Child, fullName } from "@/lib/types";

export default function MessagesTab({ kids }: { kids: Child[] }) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const loadThreads = useCallback(async () => {
    setThreads(asList<Thread>(await api<unknown>("/api/v1/threads/?page_size=200")));
  }, []);

  useEffect(() => {
    loadThreads().catch((err) => setError(errorText(err)));
    const timer = setInterval(() => loadThreads().catch(() => undefined), 20000); // new messages every 20 s
    return () => clearInterval(timer);
  }, [loadThreads]);

  const open = threads.find((t) => t.id === openId) ?? null;
  const shown = threads.filter((t) =>
    `${t.child_name ?? ""} ${t.subject} ${t.participants.join(" ")}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4">
      <div className={`${card} flex flex-col gap-3`}>
        <div className="flex gap-2">
          <input className={`${input} flex-1`} placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className={primaryButton} onClick={() => setStarting(true)}>
            + New
          </button>
        </div>
        {error && <p className={errorStyle}>{error}</p>}
        {threads.length === 0 && <p className={muted}>No conversations yet. Parents can message the school from the app, or click “+ New”.</p>}
        <div className="flex flex-col max-h-[65vh] overflow-y-auto">
          {shown.map((t) => (
            <button
              key={t.id}
              onClick={() => setOpenId(t.id)}
              className={`text-left rounded-lg px-3 py-2 ${t.id === openId ? "bg-[#EEF0F7]" : "hover:bg-[#FBF7F0]"}`}
            >
              <div className="flex justify-between gap-2">
                <span className="font-bold truncate">{t.child_name ?? t.participants.join(", ")}</span>
                <span className="text-xs text-gray-500 flex-none">{when(t.last_message_at)}</span>
              </div>
              {t.subject && <p className="text-sm truncate">{t.subject}</p>}
              <div className="flex justify-between gap-2">
                <p className={`${muted} truncate text-sm`}>{t.last_message}</p>
                {t.unread_count > 0 && (
                  <span className="flex-none rounded-full bg-[#E9A23B] px-2 text-xs font-bold text-white">{t.unread_count}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {open ? (
        <Conversation key={open.id} thread={open} onChanged={loadThreads} />
      ) : (
        <div className={`${card} grid place-items-center text-center min-h-64`}>
          <p className={muted}>Choose a conversation on the left.</p>
        </div>
      )}

      {starting && (
        <StartThread
          kids={kids}
          onClose={() => setStarting(false)}
          onStarted={async (id) => {
            setStarting(false);
            await loadThreads();
            if (id) setOpenId(id);
          }}
        />
      )}
    </div>
  );
}

function Conversation({ thread, onChanged }: { thread: Thread; onChanged: () => Promise<void> }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottom = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    const list = asList<Message>(await api<unknown>(`/api/v1/threads/${thread.id}/messages/?page_size=500`));
    setMessages(list);
  }, [thread.id]);

  useEffect(() => {
    load()
      .then(() => onChanged()) // opening marks messages as read → refresh unread badges
      .catch((err) => setError(errorText(err)));
    const timer = setInterval(() => load().catch(() => undefined), 10000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    setError("");
    try {
      await api(`/api/v1/threads/${thread.id}/messages/`, { method: "POST", json: { body: reply.trim() } });
      setReply("");
      await load();
      await onChanged();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={`${card} flex flex-col gap-3`}>
      <div className="border-b border-[#E7E1D6] pb-3">
        <p className="text-lg font-bold">{thread.child_name ?? "Conversation"}</p>
        <p className={muted}>
          {thread.subject ? `${thread.subject} · ` : ""}
          {thread.participants.join(", ")}
        </p>
      </div>
      <div className="flex flex-col gap-2 max-h-[55vh] min-h-64 overflow-y-auto">
        {messages.map((m) => (
          <div key={m.id} className={`max-w-[75%] ${m.is_mine ? "self-end text-right" : "self-start"}`}>
            <div className={`rounded-2xl px-4 py-2 whitespace-pre-line text-left ${m.is_mine ? "bg-[#1F2A5C] text-white" : "bg-[#F3EEE5]"}`}>
              {m.body}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {m.is_mine ? "You" : (m.sender_name ?? "Parent")} · {when(m.created_at)}
            </p>
          </div>
        ))}
        <div ref={bottom} />
      </div>
      {error && <p className={errorStyle}>{error}</p>}
      <form onSubmit={send} className="flex gap-2 border-t border-[#E7E1D6] pt-3">
        <textarea
          className={`${textarea} flex-1`}
          rows={2}
          placeholder="Write a reply…"
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <button className={primaryButton} disabled={sending || !reply.trim()}>
          {sending ? "Sending…" : "Send"}
        </button>
      </form>
    </div>
  );
}

function StartThread(props: { kids: Child[]; onClose: () => void; onStarted: (id: string | null) => Promise<void> }) {
  const { kids, onClose, onStarted } = props;
  const [form, setForm] = useState({ child: "", subject: "", body: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const created = await api<{ id?: string }>("/api/v1/threads/", { method: "POST", json: form });
      await onStarted(created?.id ?? null);
    } catch (err) {
      setError(errorText(err));
      setSaving(false);
    }
  }

  return (
    <Modal title="New message to parents" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4 max-w-2xl">
        <label className={label}>
          Child (the message goes to this child’s parents)
          <select className={input} required value={form.child} onChange={(e) => setForm({ ...form, child: e.target.value })}>
            <option value="">Choose a child</option>
            {kids.map((c) => (
              <option key={c.id} value={c.id}>
                {fullName(c)}
                {c.guardians?.length ? "" : " (no parent linked)"}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          Subject (optional)
          <input className={input} maxLength={150} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
        </label>
        <label className={label}>
          Message
          <textarea className={textarea} required rows={5} maxLength={4000} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        </label>
        {error && <p className={errorStyle}>{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className={secondaryButton} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className={primaryButton} disabled={saving}>
            {saving ? "Sending…" : "Send"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
