"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import Modal from "@/components/Modal";
import { card, dangerButton, errorStyle, input, label, muted, primaryButton, secondaryButton } from "@/components/ui";
import { api, type Paged } from "@/lib/api";
import { errorText } from "@/lib/errors";
import { BS_MONTHS, type Invoice, METHODS, methodLabel, npr, type Share, STATUS_STYLE, type Today } from "@/lib/fees";

const smallButton = "h-9 px-3 rounded-lg font-bold text-sm";

export default function InvoicesTab({ today }: { today: Today }) {
  const [year, setYear] = useState(today.bs_year);
  const [month, setMonth] = useState(today.bs_month);
  const [status, setStatus] = useState("");
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [generating, setGenerating] = useState(false);
  const [paying, setPaying] = useState<Invoice | null>(null);
  const [viewing, setViewing] = useState<Invoice | null>(null);
  const [sharing, setSharing] = useState<Invoice | null>(null);

  /** Open the PDF in a new tab (via the invoice's secret link, so no login is needed in that tab). */
  async function openPdf(inv: Invoice) {
    const tab = window.open("", "_blank"); // open first, so the browser doesn't block the pop-up
    try {
      const share = await api<Share>(`/api/v1/invoices/${inv.id}/share/`);
      if (tab) tab.location.href = share.pdf_url;
    } catch (err) {
      tab?.close();
      setError(errorText(err));
    }
  }

  const load = useCallback(async () => {
    const q = new URLSearchParams({ bs_year: String(year), bs_month: String(month), page_size: "500" });
    if (status) q.set("status", status);
    const data = await api<Paged<Invoice>>(`/api/v1/invoices/?${q}`);
    setInvoices(data.results);
  }, [year, month, status]);

  useEffect(() => {
    setInvoices(null);
    load().catch((err) => setError(errorText(err)));
  }, [load]);

  const period = `${BS_MONTHS[month - 1]} ${year}`;

  async function generate() {
    if (!window.confirm(`Generate ${period} invoices for every child with monthly fees?`)) return;
    setError("");
    setNotice("");
    setGenerating(true);
    try {
      const r = await api<{ created: number; skipped_existing: number }>("/api/v1/invoices/generate/", {
        method: "POST",
        json: { bs_year: year, bs_month: month, due_days: 14 },
      });
      setNotice(
        r.created === 0 && r.skipped_existing === 0
          ? "No children have monthly fees yet. Set them up in the “Child fees” tab first."
          : `Created ${r.created} invoice(s) for ${period}.` +
              (r.skipped_existing ? ` ${r.skipped_existing} child(ren) already had one.` : ""),
      );
      await load();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setGenerating(false);
    }
  }

  async function afterChange() {
    setPaying(null);
    setViewing(null);
    await load();
  }

  const open = (invoices ?? []).filter((i) => i.status !== "cancelled");
  const sum = (key: "total" | "amount_paid" | "balance") => open.reduce((s, i) => s + Number(i[key]), 0);
  const years = [today.bs_year - 1, today.bs_year, today.bs_year + 1];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-3">
        <label className={label}>
          Month (BS)
          <select className={input} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {BS_MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
        </label>
        <label className={label}>
          Year (BS)
          <select className={input} value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </label>
        <label className={label}>
          Status
          <select className={input} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            {Object.entries(STATUS_STYLE).map(([value, s]) => (
              <option key={value} value={value}>{s.text}</option>
            ))}
          </select>
        </label>
        <button className={`${primaryButton} ml-auto`} onClick={generate} disabled={generating}>
          {generating ? "Generating…" : `Generate ${period} invoices`}
        </button>
      </div>

      {notice && <p className="rounded-xl bg-[#E7F1FB] p-3 text-sm font-semibold">{notice}</p>}
      {error && <p className={errorStyle}>{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: `Billed · ${period}`, value: sum("total"), tone: "" },
          { label: "Collected", value: sum("amount_paid"), tone: "text-[#17432F]" },
          { label: "Outstanding", value: sum("balance"), tone: "text-[#8A3B12]" },
        ].map((c) => (
          <div key={c.label} className={card}>
            <div className="text-sm font-semibold text-[#5B6170]">{c.label}</div>
            <div className={`text-3xl font-extrabold mt-1 ${c.tone}`}>{invoices ? npr(c.value) : "…"}</div>
          </div>
        ))}
      </div>

      <div className={`${card} overflow-x-auto`}>
        {invoices && invoices.length === 0 ? (
          <p className={muted}>No invoices for {period} yet.</p>
        ) : (
          <table className="text-left [&_th]:px-3 [&_td]:px-3">
            <thead className="text-sm text-[#5B6170]">
              <tr>
                <th className="py-2">Invoice</th>
                <th className="py-2">Child</th>
                <th className="py-2 text-right">Total</th>
                <th className="py-2 text-right">Paid</th>
                <th className="py-2 text-right">Balance</th>
                <th className="py-2">Status</th>
                <th className="py-2">Due</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(invoices ?? []).map((inv) => (
                <tr key={inv.id} className="border-t border-[#F0EBE1]">
                  <td className="py-3 font-mono text-sm whitespace-nowrap">{inv.number}</td>
                  <td className="py-3 font-bold">{inv.child_name}</td>
                  <td className="py-3 text-right whitespace-nowrap">{npr(inv.total)}</td>
                  <td className="py-3 text-right whitespace-nowrap">{npr(inv.amount_paid)}</td>
                  <td className="py-3 text-right whitespace-nowrap font-bold">{npr(inv.balance)}</td>
                  <td className="py-3">
                    <span
                      className={`text-sm font-bold rounded-full px-3 py-1 whitespace-nowrap ${STATUS_STYLE[inv.status].style}`}
                    >
                      {STATUS_STYLE[inv.status].text}
                    </span>
                  </td>
                  <td className="py-3 whitespace-nowrap">{inv.due_date}</td>
                  <td className="py-3 whitespace-nowrap">
                    <div className="flex gap-2">
                      {(inv.status === "unpaid" || inv.status === "partial") && (
                        <button className={`${smallButton} bg-[#1F2A5C] text-white`} onClick={() => setPaying(inv)}>
                          Record payment
                        </button>
                      )}
                      <button className={`${smallButton} border border-[#D9D2C4]`} onClick={() => setViewing(inv)}>
                        View
                      </button>
                      <button className={`${smallButton} border border-[#D9D2C4]`} onClick={() => openPdf(inv)}>
                        PDF
                      </button>
                      {inv.status !== "cancelled" && (
                        <button
                          className={`${smallButton} bg-[#25D366] text-[#0B3D1F]`}
                          onClick={() => setSharing(inv)}
                        >
                          WhatsApp
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {paying && <PaymentDialog invoice={paying} today={today} onClose={() => setPaying(null)} onSaved={afterChange} />}
      {viewing && <InvoiceDialog invoice={viewing} onClose={() => setViewing(null)} onChanged={afterChange} />}
      {sharing && <ShareDialog invoice={sharing} onClose={() => setSharing(null)} />}
    </div>
  );
}

function ShareDialog({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const [share, setShare] = useState<Share | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api<Share>(`/api/v1/invoices/${invoice.id}/share/`)
      .then(setShare)
      .catch((err) => setError(errorText(err)));
  }, [invoice.id]);

  async function copyLink() {
    if (!share) return;
    await navigator.clipboard.writeText(share.pdf_url);
    setCopied(true);
  }

  return (
    <Modal title={`Send invoice ${invoice.number} · ${invoice.child_name}`} onClose={onClose}>
      <div className="flex flex-col gap-4 max-w-2xl">
        {error && <p className={errorStyle}>{error}</p>}
        {!share && !error && <p className={muted}>Preparing…</p>}
        {share && (
          <>
            <div>
              <div className="text-sm font-bold text-[#5B6170] mb-1">Message</div>
              <pre className="whitespace-pre-wrap rounded-xl bg-[#FBF7F0] border border-[#E7E1D6] p-3 text-sm font-[inherit]">
                {share.message}
              </pre>
            </div>

            {share.recipients.length === 0 ? (
              <p className={errorStyle}>
                No parent with a mobile number is linked to this child. Add one on the child&apos;s page first.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="text-sm font-bold text-[#5B6170]">Send on WhatsApp to</div>
                {share.recipients.map((r) => (
                  <a
                    key={r.phone}
                    href={r.whatsapp_url}
                    target="_blank"
                    rel="noreferrer"
                    className="h-11 px-4 rounded-xl bg-[#25D366] text-[#0B3D1F] font-bold flex items-center justify-between hover:brightness-95"
                  >
                    <span>
                      {r.name} · {r.relation}
                    </span>
                    <span className="text-sm">{r.phone}</span>
                  </a>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <a href={share.pdf_url} target="_blank" rel="noreferrer" className={`${secondaryButton} flex items-center`}>
                Open PDF
              </a>
              <button className={secondaryButton} onClick={copyLink}>
                {copied ? "Link copied ✓" : "Copy PDF link"}
              </button>
            </div>
            <p className={`${muted} text-xs`}>
              The PDF link opens only this invoice and expires after 90 days. Until KidSathi is online (deployed),
              the link only works on this computer.
            </p>
          </>
        )}
      </div>
    </Modal>
  );
}

function PaymentDialog({
  invoice,
  today,
  onClose,
  onSaved,
}: {
  invoice: Invoice;
  today: Today;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({ amount: invoice.balance, method: "cash", paid_on: today.ad, reference: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api(`/api/v1/invoices/${invoice.id}/payments/`, { method: "POST", json: form });
      onSaved();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Record payment · ${invoice.child_name} · ${invoice.period}`} onClose={onClose}>
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <p className="md:col-span-2">
          Invoice <span className="font-mono">{invoice.number}</span> · balance{" "}
          <span className="font-bold">{npr(invoice.balance)}</span>
        </p>
        <label className={label}>
          Amount (NPR)
          <input
            className={input}
            type="number"
            min="0.01"
            step="0.01"
            required
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
        </label>
        <label className={label}>
          Method
          <select className={input} value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
            {METHODS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </label>
        <label className={label}>
          Paid on (AD)
          <input
            className={input}
            type="date"
            required
            value={form.paid_on}
            onChange={(e) => setForm({ ...form, paid_on: e.target.value })}
          />
        </label>
        <label className={label}>
          Reference (transaction id, cheque no.)
          <input
            className={input}
            value={form.reference}
            onChange={(e) => setForm({ ...form, reference: e.target.value })}
          />
        </label>
        {error && <p className={`${errorStyle} md:col-span-2`}>{error}</p>}
        <div className="md:col-span-2 flex gap-3">
          <button className={primaryButton} disabled={saving}>
            {saving ? "Saving…" : "Save payment"}
          </button>
          <button type="button" className={secondaryButton} onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}

function InvoiceDialog({
  invoice,
  onClose,
  onChanged,
}: {
  invoice: Invoice;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [error, setError] = useState("");

  async function cancelInvoice() {
    if (!window.confirm(`Cancel invoice ${invoice.number}? It can be generated again afterwards.`)) return;
    try {
      await api(`/api/v1/invoices/${invoice.id}/cancel/`, { method: "POST" });
      onChanged();
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <Modal title={`Invoice ${invoice.number}`} onClose={onClose}>
      <div className="flex flex-col gap-4 max-w-2xl">
        <div className="flex flex-wrap justify-between gap-2">
          <div>
            <div className="text-xl font-bold">{invoice.child_name}</div>
            <div className={muted}>
              {invoice.period} · {invoice.period_ne}
            </div>
          </div>
          <div className="text-sm text-right">
            <div>Issued {invoice.issue_date}</div>
            <div>Due {invoice.due_date}</div>
          </div>
        </div>

        <table className="w-full text-left">
          <tbody>
            {invoice.lines.map((l) => (
              <tr key={l.description} className="border-t border-[#F0EBE1]">
                <td className="py-2">{l.description}</td>
                <td className="py-2 text-right">{npr(l.amount)}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-[#1F2A5C] font-extrabold">
              <td className="py-2">Total</td>
              <td className="py-2 text-right">{npr(invoice.total)}</td>
            </tr>
          </tbody>
        </table>

        <div>
          <h3 className="font-bold mb-1">Payments</h3>
          {invoice.payments.length === 0 ? (
            <p className={muted}>No payments yet.</p>
          ) : (
            <ul className="text-sm flex flex-col gap-1">
              {invoice.payments.map((p) => (
                <li key={p.id}>
                  {p.paid_on} · <span className="font-bold">{npr(p.amount)}</span> · {methodLabel(p.method)}
                  {p.reference && ` · ${p.reference}`}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 font-bold">Balance: {npr(invoice.balance)}</p>
        </div>

        {error && <p className={errorStyle}>{error}</p>}
        <div className="flex gap-3">
          {invoice.status !== "cancelled" && Number(invoice.amount_paid) === 0 && (
            <button className={dangerButton} onClick={cancelInvoice}>
              Cancel invoice
            </button>
          )}
          <button className={secondaryButton} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
