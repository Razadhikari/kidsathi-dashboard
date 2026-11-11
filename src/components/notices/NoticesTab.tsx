"use client";

import { useCallback, useEffect, useState } from "react";
import Modal from "@/components/Modal";
import NoticeForm from "@/components/notices/NoticeForm";
import { card, errorStyle, input, muted, primaryButton, secondaryButton } from "@/components/ui";
import { api } from "@/lib/api";
import { errorText } from "@/lib/errors";
import { type Audience, asList, audienceOf, type Notice, parseReaders, type Reader, when } from "@/lib/notices";
import type { Child, Classroom } from "@/lib/types";

type Props = { classrooms: Classroom[]; kids: Child[] };

export default function NoticesTab({ classrooms, kids }: Props) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [readers, setReaders] = useState<Record<string, Reader[]>>({});
  const [roomFilter, setRoomFilter] = useState("");
  const [editing, setEditing] = useState<Notice | "new" | null>(null);
  const [showReads, setShowReads] = useState<Notice | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const list = asList<Notice>(await api<unknown>("/api/v1/notices/?page_size=200"));
    setNotices(list);
    // read receipts for each notice (small schools: a few dozen notices)
    const pairs = await Promise.all(
      list.map(async (n) => {
        try {
          return [n.id, parseReaders(await api<unknown>(`/api/v1/notices/${n.id}/reads/`))] as const;
        } catch {
          return [n.id, [] as Reader[]] as const;
        }
      }),
    );
    setReaders(Object.fromEntries(pairs));
  }, []);

  useEffect(() => {
    load()
      .catch((err) => setError(errorText(err)))
      .finally(() => setLoading(false));
  }, [load]);

  const roomName = (id: string | null) => (id ? (classrooms.find((r) => r.id === id)?.name ?? "Class") : "Whole school");
  const shown = notices.filter((n) => !roomFilter || (roomFilter === "school" ? !n.classroom : n.classroom === roomFilter));

  async function togglePin(n: Notice) {
    try {
      await api(`/api/v1/notices/${n.id}/`, { method: "PATCH", json: { is_pinned: !n.is_pinned } });
      await load();
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap justify-between gap-2">
        <select className={`${input} w-56`} value={roomFilter} onChange={(e) => setRoomFilter(e.target.value)}>
          <option value="">All notices</option>
          <option value="school">Whole school</option>
          {classrooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <button className={primaryButton} onClick={() => setEditing("new")}>
          + New notice
        </button>
      </div>

      {error && <p className={errorStyle}>{error}</p>}
      {loading && <p className={muted}>Loading…</p>}
      {!loading && shown.length === 0 && (
        <div className={`${card} text-center`}>
          <p className="text-lg font-bold">No notices yet</p>
          <p className={muted}>Write one for holidays, fee reminders, meetings or events.</p>
        </div>
      )}

      {shown.map((n) => {
        const audience = audienceOf(kids, n.classroom);
        const read = readers[n.id] ?? [];
        const isOpen = expanded === n.id;
        return (
          <div key={n.id} className={`${card} flex flex-col gap-2 ${n.is_pinned ? "border-l-4 border-l-[#E9A23B]" : ""}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-lg font-bold">
                  {n.is_pinned && "📌 "}
                  {n.title}
                </p>
                <p className={muted}>
                  {roomName(n.classroom)} · {when(n.created_at)}
                  {n.author_name ? ` · by ${n.author_name}` : ""}
                </p>
              </div>
              <button
                onClick={() => setShowReads(n)}
                className="rounded-full bg-[#EEF0F7] px-3 py-1 text-sm font-bold text-[#1F2A5C] hover:bg-[#E2E6F2]"
              >
                👁 Read by {read.length}
                {audience.length ? ` of ${audience.length}` : ""} parents
              </button>
            </div>
            <p className={`whitespace-pre-line ${isOpen ? "" : "line-clamp-3"}`}>{n.body}</p>
            <div className="flex flex-wrap gap-2">
              {n.body.length > 200 && (
                <button className="text-sm font-bold text-[#1F2A5C] hover:underline" onClick={() => setExpanded(isOpen ? null : n.id)}>
                  {isOpen ? "Show less" : "Read more"}
                </button>
              )}
              <span className="flex-1" />
              <button className={secondaryButton} onClick={() => togglePin(n)}>
                {n.is_pinned ? "Unpin" : "📌 Pin"}
              </button>
              <button className={secondaryButton} onClick={() => setEditing(n)}>
                Edit
              </button>
            </div>
          </div>
        );
      })}

      {editing && (
        <NoticeForm
          notice={editing === "new" ? null : editing}
          classrooms={classrooms}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
          }}
        />
      )}

      {showReads && (
        <ReadsDialog
          notice={showReads}
          readers={readers[showReads.id] ?? []}
          audience={audienceOf(kids, showReads.classroom)}
          onClose={() => setShowReads(null)}
        />
      )}
    </div>
  );
}

function ReadsDialog(props: { notice: Notice; readers: Reader[]; audience: Audience[]; onClose: () => void }) {
  const { notice, readers, audience, onClose } = props;
  const readIds = new Set(readers.map((r) => r.userId).filter(Boolean));
  const readNames = new Set(readers.map((r) => r.name));
  const notRead = audience.filter((a) => !readIds.has(a.userId) && !readNames.has(a.name));

  return (
    <Modal title={`Who has read “${notice.title}”`} onClose={onClose}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
        <div>
          <p className="font-bold mb-2">✅ Read ({readers.length})</p>
          {readers.length === 0 && <p className={muted}>Nobody yet.</p>}
          <ul className="flex flex-col gap-1">
            {readers.map((r, i) => (
              <li key={`${r.userId}-${i}`} className="flex justify-between gap-2 border-b border-[#F3EEE5] py-1">
                <span>{r.name}</span>
                <span className={muted}>{when(r.readAt)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-bold mb-2">⏳ Not read yet ({notRead.length})</p>
          {notRead.length === 0 && <p className={muted}>Everyone has read it. 🎉</p>}
          <ul className="flex flex-col gap-1">
            {notRead.map((a) => (
              <li key={a.userId} className="flex justify-between gap-2 border-b border-[#F3EEE5] py-1">
                <span>
                  {a.name} <span className={muted}>({a.children.join(", ")})</span>
                </span>
                {a.phone && (
                  <a className="font-bold text-[#1F2A5C] hover:underline" href={`tel:${a.phone}`}>
                    📞 {a.phone}
                  </a>
                )}
              </li>
            ))}
          </ul>
          <p className={`${muted} mt-2`}>Parents who haven’t logged in to the app can’t read notices. Call them for urgent news.</p>
        </div>
      </div>
    </Modal>
  );
}
