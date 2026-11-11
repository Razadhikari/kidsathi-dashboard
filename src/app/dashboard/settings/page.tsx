"use client";

import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { card, errorStyle, input, label, muted, primaryButton, textarea } from "@/components/ui";
import { api, getSchool, saveSchool } from "@/lib/api";
import { errorText } from "@/lib/errors";

type SchoolDetails = {
  id: string;
  name: string;
  name_ne: string;
  address: string;
  district: string;
  phone: string;
  email: string;
  pan_number: string;
  established: string;
  bank_name: string;
  bank_branch: string;
  bank_account_name: string;
  bank_account_number: string;
  wallet_info: string;
  invoice_note: string;
};

type Field = { key: keyof SchoolDetails; text: string; placeholder?: string; wide?: boolean };

const SECTIONS: { title: string; note?: string; fields: Field[] }[] = [
  {
    title: "School",
    fields: [
      { key: "name", text: "School name (English)", placeholder: "Sunflower Montessori" },
      { key: "name_ne", text: "School name (नेपाली)", placeholder: "सनफ्लावर मोन्टेसरी" },
      { key: "pan_number", text: "PAN / VAT number", placeholder: "609876543" },
      { key: "established", text: "Established (BS year)", placeholder: "2045" },
    ],
  },
  {
    title: "Contact details",
    note: "Printed at the top of every invoice.",
    fields: [
      { key: "address", text: "Address", placeholder: "Jawalakhel-5, Lalitpur Metropolitan City" },
      { key: "district", text: "District", placeholder: "Lalitpur" },
      { key: "phone", text: "Phone", placeholder: "01-5551234 / 98XXXXXXXX" },
      { key: "email", text: "Email", placeholder: "info@sunflower.edu.np" },
    ],
  },
  {
    title: "Payment details",
    note: "Shown on invoices and in WhatsApp messages, so parents know where to pay.",
    fields: [
      { key: "bank_name", text: "Bank name", placeholder: "Nabil Bank" },
      { key: "bank_branch", text: "Branch", placeholder: "Jawalakhel" },
      { key: "bank_account_name", text: "Account name", placeholder: "Sunflower Montessori Pvt. Ltd." },
      { key: "bank_account_number", text: "Account number", placeholder: "0101017500123" },
      { key: "wallet_info", text: "eSewa / Khalti / Fonepay ID", placeholder: "eSewa: 98XXXXXXXX" },
    ],
  },
];

function Box({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return <div className={wide ? "md:col-span-3" : ""}>{children}</div>;
}

export default function SettingsPage() {
  const [school, setSchool] = useState<SchoolDetails | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const current = getSchool();
    if (!current) return;
    api<SchoolDetails>(`/api/v1/schools/${current.id}/`)
      .then(setSchool)
      .catch((err) => setError(errorText(err)));
  }, []);

  function set(key: keyof SchoolDetails, value: string) {
    setSaved(false);
    setSchool((s) => (s ? { ...s, [key]: value } : s));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!school) return;
    setError("");
    setSaving(true);
    try {
      const { id, ...body } = school;
      const updated = await api<SchoolDetails>(`/api/v1/schools/${id}/`, { method: "PATCH", json: body });
      setSchool(updated);
      saveSchool({ id: updated.id, name: updated.name }); // keep the sidebar name up to date
      setSaved(true);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  }

  if (!school) return error ? <p className={errorStyle}>{error}</p> : <p className={muted}>Loading…</p>;

  return (
    <form onSubmit={submit} className="flex flex-col gap-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-extrabold">School settings</h1>
        <p className={muted}>These details appear on invoices and in messages to parents.</p>
      </div>

      {SECTIONS.map((section) => (
        <section key={section.title} className={`${card} grid grid-cols-1 md:grid-cols-3 gap-4`}>
          <div className="md:col-span-3">
            <h2 className="text-xl font-bold">{section.title}</h2>
            {section.note && <p className={`${muted} text-sm`}>{section.note}</p>}
          </div>
          {section.fields.map((f) => (
            <Box key={f.key} wide={f.wide}>
              <label className={label}>
                {f.text}
                <input
                  className={input}
                  required={f.key === "name"}
                  placeholder={f.placeholder}
                  value={school[f.key] ?? ""}
                  onChange={(e) => set(f.key, e.target.value)}
                />
              </label>
            </Box>
          ))}
        </section>
      ))}

      <section className={card}>
        <label className={label}>
          Note printed at the bottom of invoices
          <textarea
            className={textarea}
            placeholder="e.g. Please pay by the due date. A late fee of NPR 100 applies after 7 days."
            value={school.invoice_note}
            onChange={(e) => set("invoice_note", e.target.value)}
          />
        </label>
      </section>

      {error && <p className={errorStyle}>{error}</p>}
      <div className="flex items-center gap-3">
        <button className={primaryButton} disabled={saving}>
          {saving ? "Saving…" : "Save settings"}
        </button>
        {saved && <span className="text-sm font-semibold text-[#1E5E43]">Saved ✓</span>}
      </div>
    </form>
  );
}
