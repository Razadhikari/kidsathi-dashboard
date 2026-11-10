"use client";

import { type FormEvent, useState } from "react";
import Modal from "@/components/Modal";
import { dangerButton, errorStyle, input, label, secondaryButton } from "@/components/ui";
import { api } from "@/lib/api";
import { errorText } from "@/lib/errors";
import { type Child, fullName } from "@/lib/types";

type Props = { child: Child; onClose: () => void; onDeleted: () => void };

export default function DeleteChildDialog({ child, onClose, onDeleted }: Props) {
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const name = fullName(child);
  const matches = confirm.trim().toLowerCase() === name.toLowerCase();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api(`/api/v1/children/${child.id}/delete-permanently/`, { method: "POST", json: { confirm } });
      onDeleted();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={`Delete ${name} permanently?`} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4 max-w-xl">
        <p>
          This removes the record completely and <strong>can&apos;t be undone</strong>. Use it only for mistakes,
          like a duplicate entry. Children with invoices, attendance or daily logs can&apos;t be deleted. Mark
          them as left instead, so their history is kept.
        </p>
        <label className={label}>
          <span>
            Type <span className="font-extrabold">{name}</span> to confirm
          </span>
          <input className={input} value={confirm} autoFocus onChange={(e) => setConfirm(e.target.value)} />
        </label>
        {error && <p className={errorStyle}>{error}</p>}
        <div className="flex gap-3">
          <button className={`${dangerButton} disabled:opacity-40`} disabled={!matches || busy}>
            {busy ? "Deleting…" : "Delete permanently"}
          </button>
          <button type="button" className={secondaryButton} onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}
