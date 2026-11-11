"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import Modal from "@/components/Modal";
import { errorStyle, input, label, muted, primaryButton, secondaryButton } from "@/components/ui";
import { errorText } from "@/lib/errors";
import { type Album, uploadPhoto } from "@/lib/photos";
import { type Child, fullName } from "@/lib/types";

type Props = {
  album: Album;
  kids: Child[];
  onClose: () => void;
  onDone: () => void;
};

export default function UploadDialog({ album, kids, onClose, onDone }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState("");
  const [tagged, setTagged] = useState<string[]>([]);
  const [onlyClass, setOnlyClass] = useState(Boolean(album.classroom));
  const [search, setSearch] = useState("");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  // Small previews of the chosen files
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p)), [previews]);

  const visibleChildren = kids
    .filter((c) => !onlyClass || !album.classroom || c.classroom === album.classroom)
    .filter((c) => fullName(c).toLowerCase().includes(search.toLowerCase()));

  function toggle(child: Child) {
    if (!child.photo_consent) return;
    setTagged((t) => (t.includes(child.id) ? t.filter((id) => id !== child.id) : [...t, child.id]));
  }

  function tagAllVisible() {
    const ids = visibleChildren.filter((c) => c.photo_consent).map((c) => c.id);
    setTagged((t) => Array.from(new Set([...t, ...ids])));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErrors([]);
    setProgress({ done: 0, total: files.length });
    const failed: string[] = [];
    for (const [i, file] of files.entries()) {
      try {
        await uploadPhoto(album.id, file, caption, tagged);
      } catch (err) {
        failed.push(`${file.name}: ${err instanceof Error ? err.message : errorText(err)}`);
      }
      setProgress({ done: i + 1, total: files.length });
    }
    setErrors(failed);
    onDone();
    if (failed.length === 0) onClose();
  }

  const busy = progress !== null && progress.done < progress.total;
  const noConsent = visibleChildren.filter((c) => !c.photo_consent).length;

  return (
    <Modal title={`Upload photos · ${album.title}`} onClose={busy ? () => undefined : onClose}>
      <form onSubmit={submit} className="flex flex-col gap-5">
        <label className={label}>
          Photos (you can choose many at once)
          <input
            type="file"
            accept="image/*"
            multiple
            required
            disabled={busy}
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            className="block w-full text-sm file:mr-3 file:h-10 file:px-4 file:rounded-lg file:border-0 file:bg-[#1F2A5C] file:text-white file:font-bold"
          />
        </label>

        {files.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {previews.map((p, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p} src={p} alt={files[i].name} className="h-20 w-20 flex-none rounded-lg object-cover" />
            ))}
          </div>
        )}

        <label className={label}>
          Caption (optional, same for all photos in this upload)
          <input className={input} maxLength={300} value={caption} onChange={(e) => setCaption(e.target.value)} />
        </label>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-bold">
              Tag children <span className={muted}>({tagged.length} chosen)</span>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {album.classroom && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={onlyClass} onChange={(e) => setOnlyClass(e.target.checked)} />
                  Only this album’s class
                </label>
              )}
              <input
                className={`${input} h-9 w-44`}
                placeholder="Search name"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button type="button" className={secondaryButton} onClick={tagAllVisible}>
                Tag all shown
              </button>
              <button type="button" className={secondaryButton} onClick={() => setTagged([])}>
                Clear
              </button>
            </div>
          </div>
          <p className={muted}>
            Parents only see photos where their own child is tagged. Untagged photos are seen by staff only.
            {noConsent > 0 && ` ${noConsent} child(ren) without photo consent are greyed out and can’t be tagged.`}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
            {visibleChildren.map((c) => {
              const on = tagged.includes(c.id);
              return (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => toggle(c)}
                  disabled={!c.photo_consent}
                  title={c.photo_consent ? "" : "No photo consent — edit the child to change this"}
                  className={`text-left rounded-lg border px-3 py-2 text-sm ${
                    !c.photo_consent
                      ? "border-dashed border-gray-300 bg-gray-50 text-gray-400 cursor-not-allowed"
                      : on
                        ? "border-[#1F2A5C] bg-[#1F2A5C] text-white"
                        : "border-[#E7E1D6] bg-white"
                  }`}
                >
                  {on ? "✓ " : ""}
                  {fullName(c)}
                  {!c.photo_consent && <span className="block text-xs">🚫 no consent</span>}
                </button>
              );
            })}
          </div>
        </div>

        {progress && (
          <div>
            <div className="h-2 rounded bg-[#F3EEE5]">
              <div
                className="h-2 rounded bg-[#E9A23B] transition-all"
                style={{ width: `${(progress.done / Math.max(progress.total, 1)) * 100}%` }}
              />
            </div>
            <p className={muted}>
              Uploaded {progress.done} of {progress.total}
            </p>
          </div>
        )}
        {errors.length > 0 && (
          <div className={errorStyle}>
            {errors.length} photo(s) failed:
            <ul className="list-disc pl-5">
              {errors.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <button type="button" className={secondaryButton} onClick={onClose} disabled={busy}>
            {errors.length ? "Close" : "Cancel"}
          </button>
          <button type="submit" className={primaryButton} disabled={busy || files.length === 0}>
            {busy ? "Uploading…" : `Upload ${files.length || ""} photo${files.length === 1 ? "" : "s"}`}
          </button>
        </div>
      </form>
    </Modal>
  );
}
