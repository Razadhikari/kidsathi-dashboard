"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import Modal from "@/components/Modal";
import SecureImage from "@/components/photos/SecureImage";
import UploadDialog from "@/components/photos/UploadDialog";
import { card, dangerButton, errorStyle, input, label, muted, primaryButton, secondaryButton } from "@/components/ui";
import { api, type Paged } from "@/lib/api";
import { errorText } from "@/lib/errors";
import { ALBUM_IDEAS, type Album, type Photo, todayAD } from "@/lib/photos";
import type { Child, Classroom } from "@/lib/types";

export default function PhotosPage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [roomFilter, setRoomFilter] = useState("");
  const [open, setOpen] = useState<Album | null>(null);
  const [editing, setEditing] = useState<Album | "new" | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [a, rooms, kids] = await Promise.all([
      api<Paged<Album>>("/api/v1/albums/?page_size=500"),
      api<Paged<Classroom>>("/api/v1/classrooms/?page_size=500"),
      api<Paged<Child>>("/api/v1/children/?page_size=500"),
    ]);
    setAlbums(a.results);
    setClassrooms(rooms.results);
    setChildren(kids.results);
    // keep the open album's numbers fresh
    setOpen((cur) => (cur ? (a.results.find((x) => x.id === cur.id) ?? null) : null));
  }, []);

  useEffect(() => {
    load()
      .catch((err) => setError(errorText(err)))
      .finally(() => setLoading(false));
  }, [load]);

  const roomName = (id: string | null) => (id ? (classrooms.find((r) => r.id === id)?.name ?? "Class") : "Whole school");
  const shown = albums.filter((a) => !roomFilter || (roomFilter === "school" ? !a.classroom : a.classroom === roomFilter));

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      {open ? (
        <AlbumView
          album={open}
          roomName={roomName(open.classroom)}
          kids={children}
          onBack={() => setOpen(null)}
          onEdit={() => setEditing(open)}
          onChanged={load}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-3xl font-extrabold">Photos</h1>
              <p className={muted}>Albums of school moments. Parents see only photos where their child is tagged.</p>
            </div>
            <div className="flex gap-2">
              <select className={`${input} w-48`} value={roomFilter} onChange={(e) => setRoomFilter(e.target.value)}>
                <option value="">All albums</option>
                <option value="school">Whole school</option>
                {classrooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <button className={primaryButton} onClick={() => setEditing("new")}>
                + New album
              </button>
            </div>
          </div>

          {error && <p className={errorStyle}>{error}</p>}
          {loading && <p className={muted}>Loading…</p>}
          {!loading && shown.length === 0 && (
            <div className={`${card} text-center`}>
              <p className="text-lg font-bold">No albums yet</p>
              <p className={muted}>Create one for an event, like “Dashain celebration”, then upload photos into it.</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {shown.map((a) => (
              <button key={a.id} onClick={() => setOpen(a)} className={`${card} text-left hover:shadow-md transition`}>
                <AlbumCover album={a} />
                <p className="mt-3 text-lg font-bold">{a.title}</p>
                <p className={muted}>
                  {a.date} · {roomName(a.classroom)} · {a.photo_count} photo{a.photo_count === 1 ? "" : "s"}
                </p>
              </button>
            ))}
          </div>
        </>
      )}

      {editing && (
        <AlbumForm
          album={editing === "new" ? null : editing}
          classrooms={classrooms}
          onClose={() => setEditing(null)}
          onSaved={async (saved) => {
            setEditing(null);
            await load();
            if (saved) setOpen(saved);
          }}
          onDeleted={async () => {
            setEditing(null);
            setOpen(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

/** First photo of the album as its cover. */
function AlbumCover({ album }: { album: Album }) {
  const [cover, setCover] = useState<Photo | null>(null);
  useEffect(() => {
    if (!album.photo_count) return;
    api<Paged<Photo>>(`/api/v1/photos/?album=${album.id}&page_size=1`)
      .then((p) => setCover(p.results[0] ?? null))
      .catch(() => undefined);
  }, [album.id, album.photo_count]);

  if (!cover) {
    return <div className="h-40 rounded-lg bg-[#F3EEE5] grid place-items-center text-4xl">📷</div>;
  }
  return <SecureImage src={cover.thumbnail_url} alt={album.title} className="h-40 w-full rounded-lg object-cover" />;
}

function AlbumView(props: {
  album: Album;
  roomName: string;
  kids: Child[];
  onBack: () => void;
  onEdit: () => void;
  onChanged: () => Promise<void>;
}) {
  const { album, roomName, kids, onBack, onEdit, onChanged } = props;
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [childFilter, setChildFilter] = useState("");
  const [uploading, setUploading] = useState(false);
  const [viewing, setViewing] = useState<number | null>(null);
  const [error, setError] = useState("");

  const loadPhotos = useCallback(async () => {
    const child = childFilter ? `&child=${childFilter}` : "";
    const p = await api<Paged<Photo>>(`/api/v1/photos/?album=${album.id}${child}&page_size=500`);
    setPhotos(p.results);
  }, [album.id, childFilter]);

  useEffect(() => {
    loadPhotos().catch((err) => setError(errorText(err)));
  }, [loadPhotos]);

  async function remove(photo: Photo) {
    if (!window.confirm("Delete this photo? Parents will no longer see it.")) return;
    try {
      await api(`/api/v1/photos/${photo.id}/`, { method: "DELETE" });
      setViewing(null);
      await loadPhotos();
      await onChanged();
    } catch (err) {
      setError(errorText(err));
    }
  }

  const current = viewing !== null ? photos[viewing] : null;
  const tagCount = (id: string) => photos.filter((p) => p.children.includes(id)).length;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <button onClick={onBack} className="text-sm font-bold text-[#1F2A5C] hover:underline">
            ← All albums
          </button>
          <h1 className="text-3xl font-extrabold">{album.title}</h1>
          <p className={muted}>
            {album.date} · {roomName} · {album.photo_count} photo{album.photo_count === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select className={`${input} w-52`} value={childFilter} onChange={(e) => setChildFilter(e.target.value)}>
            <option value="">All photos</option>
            {kids
              .filter((c) => tagCount(c.id) > 0 || c.id === childFilter)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  Photos of {c.first_name} {c.last_name}
                </option>
              ))}
          </select>
          <button className={secondaryButton} onClick={onEdit}>
            Edit album
          </button>
          <button className={primaryButton} onClick={() => setUploading(true)}>
            ⬆ Upload photos
          </button>
        </div>
      </div>

      {error && <p className={errorStyle}>{error}</p>}
      {photos.length === 0 && (
        <div className={`${card} text-center`}>
          <p className="text-lg font-bold">No photos here yet</p>
          <p className={muted}>Click “Upload photos” to add some.</p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {photos.map((p, i) => (
          <button key={p.id} onClick={() => setViewing(i)} className="group relative text-left">
            <SecureImage src={p.thumbnail_url} alt={p.caption || album.title} className="aspect-square w-full rounded-lg object-cover" />
            <span
              className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-xs font-bold ${
                p.children.length ? "bg-white/90 text-[#1F2A5C]" : "bg-[#E9A23B] text-white"
              }`}
            >
              {p.children.length ? `👦 ${p.children.length}` : "Staff only"}
            </span>
          </button>
        ))}
      </div>

      {uploading && (
        <UploadDialog
          album={album}
          kids={kids}
          onClose={() => setUploading(false)}
          onDone={async () => {
            await loadPhotos();
            await onChanged();
          }}
        />
      )}

      {current && viewing !== null && (
        <Modal title={current.caption || album.title} onClose={() => setViewing(null)}>
          <div className="flex flex-col gap-3">
            <SecureImage src={current.image_url} alt={current.caption || album.title} className="max-h-[65vh] w-full rounded-lg object-contain bg-black" />
            <p>
              <span className="font-bold">Tagged: </span>
              {current.children_names.length ? current.children_names.join(", ") : "nobody — only staff can see this photo"}
            </p>
            <p className={muted}>Tags can’t be changed after upload. To fix them, delete the photo and upload it again.</p>
            <div className="flex flex-wrap justify-between gap-2">
              <div className="flex gap-2">
                <button className={secondaryButton} disabled={viewing === 0} onClick={() => setViewing(viewing - 1)}>
                  ← Previous
                </button>
                <button
                  className={secondaryButton}
                  disabled={viewing === photos.length - 1}
                  onClick={() => setViewing(viewing + 1)}
                >
                  Next →
                </button>
              </div>
              <button className={dangerButton} onClick={() => remove(current)}>
                Delete photo
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

function AlbumForm(props: {
  album: Album | null;
  classrooms: Classroom[];
  onClose: () => void;
  onSaved: (album: Album | null) => Promise<void>;
  onDeleted: () => Promise<void>;
}) {
  const { album, classrooms, onClose, onSaved, onDeleted } = props;
  const [form, setForm] = useState({
    title: album?.title ?? "",
    date: album?.date ?? todayAD(),
    classroom: album?.classroom ?? "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const json = { ...form, classroom: form.classroom || null };
      const saved = album
        ? await api<Album>(`/api/v1/albums/${album.id}/`, { method: "PATCH", json })
        : await api<Album>("/api/v1/albums/", { method: "POST", json });
      await onSaved(saved);
    } catch (err) {
      setError(errorText(err));
      setSaving(false);
    }
  }

  async function remove() {
    if (!album) return;
    const n = album.photo_count;
    if (!window.confirm(`Delete the album “${album.title}”${n ? ` and its ${n} photo(s)` : ""}? This can’t be undone.`)) return;
    try {
      await api(`/api/v1/albums/${album.id}/`, { method: "DELETE" });
      await onDeleted();
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <Modal title={album ? "Edit album" : "New album"} onClose={onClose}>
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
        {!album && (
          <div className="md:col-span-2 flex flex-wrap gap-2">
            {ALBUM_IDEAS.map((idea) => (
              <button
                type="button"
                key={idea}
                onClick={() => setForm({ ...form, title: idea })}
                className="rounded-full border border-[#E7E1D6] bg-white px-3 py-1 text-sm hover:border-[#1F2A5C]"
              >
                {idea}
              </button>
            ))}
          </div>
        )}
        <label className={`${label} md:col-span-2`}>
          Album name
          <input
            className={input}
            required
            maxLength={150}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </label>
        <label className={label}>
          Date
          <input
            type="date"
            className={input}
            required
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </label>
        <label className={label}>
          Class
          <select className={input} value={form.classroom} onChange={(e) => setForm({ ...form, classroom: e.target.value })}>
            <option value="">Whole school</option>
            {classrooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        {error && <p className={`${errorStyle} md:col-span-2`}>{error}</p>}
        <div className="md:col-span-2 flex justify-between gap-2">
          {album ? (
            <button type="button" className={dangerButton} onClick={remove}>
              Delete album
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" className={secondaryButton} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={primaryButton} disabled={saving}>
              {saving ? "Saving…" : album ? "Save" : "Create album"}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
